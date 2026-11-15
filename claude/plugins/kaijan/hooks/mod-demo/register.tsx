import { atom, read, update } from "claude-code";
import { qaDemoEnabled, type QaDemoState } from "../qa-demos.mjs";
import type {
  Elements,
  EngineInterface,
  Register,
  RenderElement,
  RenderSurface,
} from "claude-code";

import type { PaneTab, Run, TestCase, ThemeName } from "./types";
import {
  PANE,
  PLUGIN,
  SEEDS,
  freshRun,
  resetForm,
  summaryText,
  tally,
} from "./state";

// ---------------------------------------------------------------- state ----
// Every value a drawing reads lives in $.state (it outlives a hot reload);
// the scan wants the atoms defined in the file that reads and writes them.

const run = atom(
  { plugin: "kaijan", key: "modDemoRun" } as const,
  freshRun(0),
  { shape: "run-1" },
);
const history = atom(
  { plugin: "kaijan", key: "modDemoHistory" } as const,
  [],
  { shape: "history-1" },
);
const collapsed = atom(
  { plugin: "kaijan", key: "modDemoCollapsed" } as const,
  {},
  { shape: "collapsed-1" },
);
const tab = atom(
  { plugin: "kaijan", key: "modDemoTab" } as const,
  "gallery",
);
const filter = atom(
  { plugin: "kaijan", key: "modDemoFilter" } as const,
  "all",
);
const selectedCase = atom(
  { plugin: "kaijan", key: "modDemoSelectedCase" } as const,
  "",
);
const form = atom(
  { plugin: "kaijan", key: "modDemoForm" } as const,
  resetForm(),
  { shape: "form-1" },
);
const echo = atom(
  { plugin: "kaijan", key: "modDemoEcho" } as const,
  "",
);
const counter = atom(
  { plugin: "kaijan", key: "modDemoCounter" } as const,
  0,
);
const laps = atom(
  { plugin: "kaijan", key: "modDemoLaps" } as const,
  [],
  { shape: "laps-1" },
);
const theme = atom(
  { plugin: "kaijan", key: "modDemoTheme" } as const,
  "off",
);
const band = atom(
  { plugin: "kaijan", key: "modDemoBand" } as const,
  true,
);
const lastAction = atom(
  { plugin: "kaijan", key: "modDemoLastAction" } as const,
  "",
);
const demoSession = atom(
  { plugin: "kaijan", key: "modDemoSession" } as const,
  "",
);
const demoCommand = /^(?:kaijan(?:-qa|-local)?:)?mod-demo$/;
const isDemoSession = async ($: EngineInterface) =>
  (await read($, demoSession)) === (await $.session.id());

async function note($: EngineInterface, text: string) {
  await update($, lastAction, () => text);
}

/**
 * Runs the scripted suite: each case goes queued -> running -> result, one
 * state write per step, so every card, the pane and the band redraw live.
 * `onlyFailed` reruns the failed cases of the current run and keeps the rest.
 */
async function simulateRun(
  $: EngineInterface,
  options: { onlyFailed?: boolean; signal?: AbortSignal } = {},
): Promise<Run> {
  const current = await read($, run);
  if (current.status === "running")
    throw Error(
      "The earlier simulation was interrupted; its partial sample state is retained.",
    );

  const now = await $.clock.now();
  const isRerun =
    options.onlyFailed === true &&
    current.cases.some((c) => c.status === "failed");
  const targets = new Set(
    isRerun
      ? current.cases.filter((c) => c.status === "failed").map((c) => c.id)
      : SEEDS.map((s) => s.id),
  );
  const base: Run = isRerun ? current : freshRun(current.id);
  const started: Run = {
    ...base,
    id: current.id + 1,
    status: "running",
    startedAt: now,
    endedAt: 0,
    cases: base.cases.map((c) =>
      targets.has(c.id)
        ? { ...c, status: "queued" as const, ms: 0, error: "" }
        : c,
    ),
  };
  await update($, run, () => started);
  await update($, selectedCase, () => "");

  let index = 0;
  for (const seed of SEEDS) {
    if (!targets.has(seed.id)) continue;
    index += 1;
    await update($, run, (r) => ({
      ...r,
      cases: r.cases.map((c): TestCase =>
        c.id === seed.id ? { ...c, status: "running" as const } : c,
      ),
    }));
    $.ui.status(
      `kaijan: run #${started.id} · ${index}/${targets.size} · ${seed.name}`,
    );
    await $.clock.sleep(
      Math.round(seed.ms * 0.6),
      options.signal ? { signal: options.signal } : {},
    );
    // The first full run fails the coupon test; a rerun of failures passes it.
    const fails =
      seed.failsFirst !== undefined && !isRerun && started.id % 2 === 1;
    await update($, run, (r) => ({
      ...r,
      cases: r.cases.map((c): TestCase =>
        c.id === seed.id
          ? {
              ...c,
              status:
                seed.skip === true ? "skipped" : fails ? "failed" : "passed",
              ms: seed.skip === true ? 0 : seed.ms,
              error: fails ? (seed.failsFirst ?? "") : "",
            }
          : c,
      ),
    }));
  }

  const endedAt = await $.clock.now();
  const finished = await update($, run, (r) => ({
    ...r,
    status: "done" as const,
    endedAt,
  }));
  const t = tally(finished);
  await update($, history, (list) =>
    [
      ...list,
      {
        id: finished.id,
        passed: t.passed,
        failed: t.failed,
        skipped: t.skipped,
        ms: t.ms,
      },
    ].slice(-12),
  );
  $.ui.status(undefined);
  const summary = `Simulated UI run #${finished.id}: ${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped`;
  $.ui.toast(summary);
  await note($, summary);
  return finished;
}

// A tool request and a button press can overlap. Read the same live simulation
// through its completion instead of returning an unfinished snapshot as final.
type DemoObservers = {
  liveRuns: Map<string, Promise<Run>>;
  initializedSessions: Set<string>;
};
async function runSuite(
  $: EngineInterface,
  observers: DemoObservers,
  options: { onlyFailed?: boolean; signal?: AbortSignal } = {},
): Promise<Run> {
  const { liveRuns } = observers;
  const session = await $.session.id();
  const existing = liveRuns.get(session);
  if (existing) return existing;
  const work = simulateRun($, options);
  liveRuns.set(session, work);
  try {
    return await work;
  } catch (error) {
    await update($, run, (r) => ({ ...r, status: "stopped" as const }));
    $.ui.status(undefined);
    throw error;
  } finally {
    if (liveRuns.get(session) === work) liveRuns.delete(session);
  }
}
import { backdrop } from "./svg";
import {
  CARD_KINDS,
  CARD_LABELS,
  bandRow,
  chartCard,
  codeCard,
  formCard,
  kitOf,
  liveCard,
  markdownCard,
  menuCard,
  pane,
  reportCard,
} from "./views";
import type { Actions, CardData, CardKind, Kit } from "./views";

const TOOL_CARD = `mcp__${PLUGIN}__show_mod_card`;
const TOOL_RUN = `mcp__${PLUGIN}__run_mod_suite`;
const ACCENT = "#d97757";

const isKind = (s: string): s is CardKind =>
  (CARD_KINDS as readonly string[]).includes(s);
const isTheme = (s: string): s is ThemeName =>
  s === "off" || s === "aurora" || s === "grid" || s === "sunset";

// --------------------------------------------------------------- actions ----

function actionsFor($: EngineInterface, observers: DemoObservers): Actions {
  // Long work (a run) goes on a timer, so it outlives the press that asked for it.
  const later = (fn: () => Promise<unknown>) => {
    $.clock.after(1, async () => {
      try {
        await fn();
      } catch (err) {
        $.ui.log(`kaijan: ${String(err)}`, { to: "debug" });
        $.ui.toast(
          "The UI demo action could not finish. Reopen the demo to continue.",
        );
      }
    });
  };

  const openPane = (t?: PaneTab) =>
    later(async () => {
      if (t) await update($, tab, () => t);
      const opened = await $.ui.open({
        id: PANE,
        title: "Kaijan UI demo",
        columns: 72,
      });
      if (!opened.isPlaced) $.ui.toast(`Pane waits: ${opened.reason}`);
    });

  const place = (kind: CardKind) =>
    later(async () => {
      const id = `${kind}-${Math.round(await $.clock.now())}`;
      const placed = await $.ui.place({ id });
      await note($, `Placed the ${CARD_LABELS[kind].toLowerCase()} card`);
      if (!placed.isPlaced) $.ui.toast(`Card not drawn: ${placed.reason}`);
    });

  const setTheme = (name: ThemeName) =>
    later(async () => {
      await update($, theme, () => name);
      if (name === "off") {
        await $.theme.clear();
        await note($, "Backdrop cleared");
        return;
      }
      const result = await $.theme.set({
        backdrop: {
          id: name,
          glass: { blur: 18, opacity: 0.55 },
          colorScheme: "dark",
        },
      });
      if (result.isDrawn) await note($, `Backdrop: ${name}`);
      else
        $.ui.toast(
          `Backdrop not drawn here: ${"reason" in result ? String(result.reason) : "unsupported surface"}`,
        );
    });

  return {
    openPane,
    setTab: (t) => void update($, tab, () => t),
    place,
    startRun: (onlyFailed) =>
      later(() => runSuite($, observers, { onlyFailed })),
    resetRun: () =>
      later(async () => {
        const r = await read($, run);
        if (r.status !== "running") await update($, run, () => freshRun(r.id));
        await update($, selectedCase, () => "");
      }),
    setFilter: (f) => void update($, filter, () => f),
    selectCase: (id) => void update($, selectedCase, () => id),
    toggleCollapsed: (id) =>
      void update($, collapsed, (m) => ({ ...m, [id]: !m[id] })),
    copy: (text, surface: RenderSurface) =>
      later(async () => {
        const res = await $.ui.copy({ text, surface });
        $.ui.toast(
          res.isCopied
            ? "Copied to the clipboard"
            : `Not copied: ${res.reason}`,
        );
      }),
    fillPrompt: (text) => later(() => $.prompt.fill({ text, mode: "replace" })),
    submitPrompt: (text) =>
      later(async () => {
        await note($, "Sent a prompt to Claude");
        await $.prompt.submit({ text });
      }),
    toast: (text) => {
      $.ui.toast(text);
      void note($, `Toast: ${text}`);
    },
    status: (text) => {
      $.ui.status(text);
      void note($, text ? "Status line pinned" : "Status line cleared");
    },
    notify: (text) =>
      later(async () => {
        const res = await $.ui.notify(text, {
          title: "Kaijan UI demo",
          key: "demo",
        });
        await note(
          $,
          res.isSent
            ? `Notification sent via ${res.channel}`
            : `Notification not sent: ${res.reason}`,
        );
      }),
    ask: () =>
      later(async () => {
        try {
          const pick = await $.ui.ask(
            "Which card should the showcase place next?",
            {
              header: "Showcase",
              options: ["Test report", "Charts", "Form", "Markdown"],
            },
          );
          const kind: CardKind =
            pick === "Charts"
              ? "chart"
              : pick === "Form"
                ? "form"
                : pick === "Markdown"
                  ? "markdown"
                  : "report";
          await note($, `You picked “${pick}” in the ask dialog`);
          place(kind);
        } catch {
          await note($, "Ask dialog dismissed");
        }
      }),
    log: (text) => {
      $.ui.log(text);
      void note($, "Logged a transcript line");
    },
    setForm: (change) => void update($, form, change),
    submitForm: () =>
      later(async () => {
        const now = await $.clock.now();
        const f = await update($, form, (x) => ({ ...x, submittedAt: now }));
        $.ui.toast(`Scheduled ${f.project} on ${f.env} (${f.browser})`);
        await note($, `Form submitted: ${f.project} / ${f.env}`);
      }),
    resetForm: () => void update($, form, () => resetForm()),
    setEcho: (text) => void update($, echo, () => text),
    bump: (by) => void update($, counter, (n) => n + by),
    setTheme,
    setBand: (enabled) => void update($, band, () => enabled),
    scrollPaneEnd: () => later(() => $.ui.scroll({ in: PANE, to: "end" })),
  };
}

// ------------------------------------------------------------- drawing ----

async function cardData(
  $: EngineInterface,
  id: string,
  columns: number,
): Promise<CardData> {
  return {
    id,
    columns,
    collapsed: (await read($, collapsed))[id] === true,
    run: await read($, run),
    history: await read($, history),
    form: await read($, form),
    selectedCase: await read($, selectedCase),
  };
}

function cardContent(
  k: Kit,
  a: Actions,
  kind: CardKind,
  d: CardData,
  client: RenderElement | null,
): RenderElement {
  switch (kind) {
    case "report":
      return reportCard(k, a, d);
    case "chart":
      return chartCard(k, a, d);
    case "form":
      return formCard(k, a, d);
    case "code":
      return codeCard(k, a, d);
    case "markdown":
      return markdownCard(k, a, d);
    case "live":
      return liveCard(k, a, d, client);
    case "menu":
      return menuCard(k, a, d);
  }
}

function demoFrame(k: Kit, content: RenderElement): RenderElement {
  const { Box, Text } = k;
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>UI demo · Simulated data, no application tests</Text>
      {content}
    </Box>
  );
}

function drawCard(
  k: Kit,
  a: Actions,
  kind: CardKind,
  d: CardData,
  client: RenderElement | null,
): RenderElement {
  return demoFrame(k, cardContent(k, a, kind, d, client));
}

// --------------------------------------------------------------- hooks ----

async function initializeDemo($: EngineInterface, observers: DemoObservers) {
  const { initializedSessions } = observers;
  const sessionId = await $.session.id();
  if (initializedSessions.has(sessionId)) return;
  // The packaged mod-demo skill supplies the command; handle that explicit
  // command below rather than registering a second global entry.
  await $.tool.register({
    name: "show_mod_card",
    description:
      "Show the user an interactive Kaijan UI demo card inline in the chat; the mod draws it under this tool call. " +
      "Kinds: report (test report with run controls), chart (SVG charts), form (inputs and selects), " +
      "code (highlighted code and a diff), markdown (rich text with links), live (animated client region), " +
      "menu (launcher for everything). Only use after the person invokes the mod-demo UI showcase. Sample data only; this does not show a real Kaijan report.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: [...CARD_KINDS] },
        note: {
          type: "string",
          description: "Optional one-line caption drawn above the card.",
        },
      },
      required: ["kind"],
    },
    isDeferred: true,
  });
  await $.tool.register({
    name: "run_mod_suite",
    description:
      "Run the Kaijan UI demo's scripted demo test suite (8 simulated checkout tests, about 4 seconds). " +
      "The user watches progress live in a card under this call. Returns the result summary.",
    inputSchema: {
      type: "object",
      properties: {
        only_failed: {
          type: "boolean",
          description: "Rerun only the tests that failed last time.",
        },
      },
    },
    isDeferred: true,
  });
  initializedSessions.add(sessionId);
  // Restore an explicitly chosen theme only when the showcase is reopened.
  const chosen = await read($, theme);
  if (chosen !== "off" && (await isDemoSession($))) {
    void $.theme.set({
      backdrop: {
        id: chosen,
        glass: { blur: 18, opacity: 0.55 },
        colorScheme: "dark",
      },
    });
  }
}

export const register = (on: Parameters<Register>[0], qaDemos: QaDemoState) => {
  // Keep transient observers in this host registration, not shared module state.
  const observers: DemoObservers = {
    liveRuns: new Map(),
    initializedSessions: new Set(),
  };
  // ---- the slash command ----

  on("command.run", { command: demoCommand }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    const sessionId = await $.session.id();
    await update($, demoSession, () => sessionId);
    if (!(await $.session.surfaces()).length)
      return {
        text: "Kaijan UI demo — simulated presentation examples. Native surfaces are unavailable here. The tour covers report/chart/form/code/Markdown/live cards, a tabbed pane and backdrops. No application test was run.",
      };
    await initializeDemo($, observers);
    const a = actionsFor($, observers);
    const [word = "", arg = ""] = e.args.trim().toLowerCase().split(/\s+/);
    if (word === "" || word === "menu") return { text: "Kaijan UI demo menu." };
    if (word === "pane" || word === "panel") {
      a.openPane();
      return { text: "Opened the Kaijan UI demo pane." };
    }
    if (word === "run") {
      a.startRun(arg === "failed");
      return {
        text: "Started the demo suite; watch the band and any report card.",
      };
    }
    if (word === "theme") {
      const name = isTheme(arg) ? arg : "aurora";
      a.setTheme(name);
      return { text: `Backdrop set to ${name}.` };
    }
    if (word === "all") {
      for (const kind of CARD_KINDS) if (kind !== "menu") a.place(kind);
      return { text: "Placed every card kind." };
    }
    if (isKind(word)) {
      a.place(word);
      return { text: `Placed the ${CARD_LABELS[word].toLowerCase()} card.` };
    }
    return {
      text: `Unknown option “${word}”. Try /${$.plugin.name}:mod-demo with no arguments for the menu.`,
    };
  });

  // The command's own output row, drawn as the menu card when it ran bare.
  on(
    "ui.render",
    { component: "CommandOutput", props: { command: demoCommand } },
    async ($, e, next) => {
      if (!(await qaDemoEnabled($, qaDemos))) return next(e);
      const word = e.props.args.trim().toLowerCase();
      if (e.props.isErrored || (word !== "" && word !== "menu")) return next(e);
      const k = kitOf($.ui.resolve(e), e.surface);
      return demoFrame(
        k,
        menuCard(k, actionsFor($, observers), {
          id: e.requestId,
          columns: e.viewport?.columns ?? 80,
        }),
      );
    },
  );

  // ---- placed rows ----

  on("ui.render", { component: "Placed" }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (e.props.plugin !== PLUGIN) return next(e);
    const kind = e.props.id.split("-")[0] ?? "";
    if (!isKind(kind)) return next(e);
    const table = $.ui.resolve(e);
    const k = kitOf(table, e.surface);
    const { Client } = table as Partial<Elements["desktop"]>;
    const client = Client ? (
      <Client
        key="live"
        module="./live.tsx"
        props={{ accent: ACCENT, label: "inline card" }}
      />
    ) : null;
    const d = await cardData($, e.props.id, e.viewport?.columns ?? 80);
    return drawCard(k, actionsFor($, observers), kind, d, client);
  });

  // ---- the model's tools, and their rows ----

  on("tool.call", { tool: TOOL_CARD }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (!(await isDemoSession($)))
      return {
        result: `Open /${$.plugin.name}:mod-demo first to try the simulated UI showcase.`,
      };
    const input = e as unknown as { kind?: string };
    const kind = isKind(input.kind ?? "") ? input.kind : "menu";
    await note($, `Claude showed the ${kind} card`);
    return {
      result: `Prepared the simulated ${kind} UI demo card for the native host. This is not a real Kaijan report.`,
    };
  });

  on("tool.call", { tool: TOOL_RUN }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (!(await isDemoSession($)))
      return {
        result: `Open /${$.plugin.name}:mod-demo first to try the simulated UI showcase.`,
      };
    const input = e as unknown as { only_failed?: boolean };
    const finished = await runSuite($, observers, {
      onlyFailed: input.only_failed === true,
      signal: next.signal,
    });
    return { result: summaryText(finished) };
  }).catch(async ($) => ({
    result: `The simulated UI run stopped before completion. Partial sample data is retained.\n${summaryText(await read($, run))}`,
  }));

  on(
    "ui.render",
    {
      component: "ToolUse",
      props: {
        tool: /^mcp__kaijan(?:-qa|-local)?__(?:show_mod_card|run_mod_suite)$/,
      },
    },
    async ($, e, next) => {
      if (!(await qaDemoEnabled($, qaDemos))) return next(e);
      const tool = e.props.tool;
      if (tool !== TOOL_CARD && tool !== TOOL_RUN) return next(e);
      const row = await next(e);
      const table = $.ui.resolve(e);
      const k = kitOf(table, e.surface);
      const { Box, Text } = k;
      const input = (e.props.input ?? {}) as { kind?: string; note?: string };
      const kind: CardKind =
        tool === TOOL_RUN
          ? "report"
          : isKind(input.kind ?? "")
            ? (input.kind as CardKind)
            : "menu";
      const { Client } = table as Partial<Elements["desktop"]>;
      const client = Client ? (
        <Client
          key="live"
          module="./live.tsx"
          props={{ accent: ACCENT, label: "under a tool call" }}
        />
      ) : null;
      const d = await cardData($, e.requestId, e.viewport?.columns ?? 80);
      return (
        <Box flexDirection="column" gap={1}>
          {row}
          {input.note ? (
            <Text dimColor italic>
              {input.note}
            </Text>
          ) : null}
          {drawCard(k, actionsFor($, observers), kind, d, client)}
        </Box>
      );
    },
  );

  // ---- the side pane ----

  on(
    "ui.render",
    { component: "Pane", requestId: "kaijan-mod-demo" },
    async ($, e, next) => {
      if (!(await qaDemoEnabled($, qaDemos))) return next(e);
      const table = $.ui.resolve(e);
      const k = kitOf(table, e.surface);
      const { Client } = table as Partial<Elements["desktop"]>;
      const client = Client ? (
        <Client
          key="live-pane"
          module="./live.tsx"
          props={{ accent: ACCENT, label: "side pane" }}
        />
      ) : null;
      return demoFrame(
        k,
        pane(
          k,
          actionsFor($, observers),
          {
            columns: e.props.bodyColumns,
            isFocused: e.props.isFocused,
            tab: await read($, tab),
            filter: await read($, filter),
            selectedCase: await read($, selectedCase),
            run: await read($, run),
            history: await read($, history),
            form: await read($, form),
            echo: await read($, echo),
            counter: await read($, counter),
            laps: await read($, laps),
            theme: await read($, theme),
            band: await read($, band),
            lastAction: await read($, lastAction),
          },
          client,
        ),
      );
    },
  );

  // ---- the band above the prompt ----

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (
      e.props.hasSurvey ||
      !(await isDemoSession($)) ||
      !(await read($, band))
    )
      return next(e);
    const k = kitOf($.ui.resolve(e), e.surface);
    return bandRow(k, actionsFor($, observers), {
      run: await read($, run),
      lastAction: await read($, lastAction),
      isWorking: e.props.isWorking,
      columns: e.props.bodyColumns,
    });
  });

  // ---- the backdrop behind the conversation ----

  on("ui.render", { component: "Backdrop" }, async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (
      e.props.plugin !== PLUGIN ||
      !isTheme(e.props.id) ||
      e.props.id === "off"
    )
      return next(e);
    const { Svg } = $.ui.resolve(e) as Partial<Elements["desktop"]>;
    if (!Svg) return next(e);
    return (
      <Svg
        source={backdrop(e.props.id)}
        alt={`${e.props.id} backdrop`}
        isInteractive
      />
    );
  });

  // ---- what the Client module posts ----

  on("ui.message", async ($, e, next) => {
    if (!(await qaDemoEnabled($, qaDemos))) return next(e);
    if (
      !(await isDemoSession($)) ||
      e.module.replace(/^\.\//, "") !== "hooks/mod-demo/live.tsx"
    )
      return next(e);
    const data = e.data as { type?: string; ms?: number } | null;
    if (data?.type === "lap" && typeof data.ms === "number") {
      const ms = data.ms;
      const list = await update($, laps, (l) => [...l, ms].slice(-10));
      $.ui.toast(`Lap ${list.length}: ${(ms / 1000).toFixed(2)}s`);
      await note($, `Lap ${list.length} posted from the live client`);
    }
    if (data?.type === "reset") {
      await update($, laps, () => []);
      await note($, "Stopwatch reset");
    }
    return next(e);
  });
};
