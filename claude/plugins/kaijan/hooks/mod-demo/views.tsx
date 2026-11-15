// Every drawing of the showcase: the inline cards (placed rows, tool rows,
// the command's output row) and the side pane's tabs. Plain functions over a
// `Kit` (the surface's element table), so one card draws in any site.

import type {
  Elements,
  RenderChildren,
  RenderElement,
  RenderSurface,
  ThemeKey,
} from "claude-code";

import type {
  CaseFilter,
  CaseStatus,
  FormValue,
  PaneTab,
  Run,
  RunSummary,
  TestCase,
  ThemeName,
} from "./types";
import { TAB_LABELS, THEMES, tally, visibleCases } from "./state";
import { badge, donut, durationBars, progressBar, trend } from "./svg";

// ------------------------------------------------------------------ kit ----

type D = Elements["desktop"];

export type Kit = {
  surface: RenderSurface;
  Box: D["Box"];
  Text: D["Text"];
  Button: D["Button"];
  Link: D["Link"];
  Code: D["Code"];
  Markdown: D["Markdown"];
  Input: D["Input"] | undefined;
  Select: D["Select"] | undefined;
  Svg: D["Svg"] | undefined;
};

export function kitOf(
  table: Elements[RenderSurface],
  surface: RenderSurface,
): Kit {
  const t = table as Partial<D> &
    Pick<D, "Box" | "Text" | "Button" | "Link" | "Code" | "Markdown">;
  return {
    surface,
    Box: t.Box,
    Text: t.Text,
    Button: t.Button,
    Link: t.Link,
    Code: t.Code,
    Markdown: t.Markdown,
    Input: t.Input,
    Select: t.Select,
    Svg: t.Svg,
  };
}

/** What the cards and the pane can ask for; built in register.tsx around `$`. */
export type Actions = {
  openPane: (tab?: PaneTab) => void;
  setTab: (tab: PaneTab) => void;
  place: (kind: CardKind) => void;
  startRun: (onlyFailed: boolean) => void;
  resetRun: () => void;
  setFilter: (f: CaseFilter) => void;
  selectCase: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  copy: (text: string, surface: RenderSurface) => void;
  fillPrompt: (text: string) => void;
  submitPrompt: (text: string) => void;
  toast: (text: string) => void;
  status: (text: string | undefined) => void;
  notify: (text: string) => void;
  ask: () => void;
  log: (text: string) => void;
  setForm: (change: (f: FormValue) => FormValue) => void;
  submitForm: () => void;
  resetForm: () => void;
  setEcho: (text: string) => void;
  bump: (by: number) => void;
  setTheme: (name: ThemeName) => void;
  setBand: (on: boolean) => void;
  scrollPaneEnd: () => void;
};

export const CARD_KINDS = [
  "report",
  "chart",
  "form",
  "code",
  "markdown",
  "live",
  "menu",
] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARD_LABELS: Record<CardKind, string> = {
  report: "Test report",
  chart: "Charts",
  form: "Form",
  code: "Code & diff",
  markdown: "Markdown",
  live: "Live client",
  menu: "Menu",
};

// -------------------------------------------------------------- helpers ----

const STATUS: Record<
  CaseStatus,
  { glyph: string; color: ThemeKey; label: string }
> = {
  passed: { glyph: "✓", color: "success", label: "passed" },
  failed: { glyph: "✗", color: "error", label: "failed" },
  skipped: { glyph: "⊘", color: "warning", label: "skipped" },
  running: { glyph: "●", color: "suggestion", label: "running" },
  queued: { glyph: "○", color: "inactive", label: "queued" },
};

const svgWidth = (columns: number) =>
  Math.max(240, Math.min(640, Math.round(columns * 7.2)));

function chip(k: Kit, label: string, color: ThemeKey): RenderElement {
  const { Text } = k;
  return (
    <Text color={color} weight="medium" size="footnote">
      {` ${label} `}
    </Text>
  );
}

function eyebrow(k: Kit, label: string): RenderElement {
  const { Text } = k;
  return (
    <Text color="claude" size="caption" weight="semibold">
      {label.toUpperCase()}
    </Text>
  );
}

/** The frame every inline card shares: border, padding, header with a collapse toggle. */
export function cardShell(
  k: Kit,
  a: Actions,
  opts: {
    id: string;
    eyebrow: string;
    title: string;
    collapsed: boolean;
    summary?: string;
  },
  body: RenderChildren,
): RenderElement {
  const { Box, Text, Button, Svg } = k;
  return (
    <Box
      key={`card-${opts.id}`}
      flexDirection="column"
      borderStyle="round"
      borderColor="subtle"
      hover={{ borderColor: "claude" }}
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
      >
        <Box flexDirection="row" alignItems="center" gap={1}>
          {Svg ? (
            <Svg
              source={badge(22)}
              alt="Kaijan UI demo"
              width={22}
              height={22}
              isInteractive
            />
          ) : null}
          <Box flexDirection="column">
            {eyebrow(k, opts.eyebrow)}
            <Text size="heading" weight="semibold">
              {opts.title}
            </Text>
          </Box>
        </Box>
        <Button
          key={`collapse-${opts.id}`}
          plain
          dimColor
          label={opts.collapsed ? "▸ Expand" : "▾ Collapse"}
          onPress={() => a.toggleCollapsed(opts.id)}
        />
      </Box>
      {opts.collapsed ? (
        <Text dimColor>{opts.summary ?? "Collapsed."}</Text>
      ) : (
        body
      )}
    </Box>
  );
}

function textBar(k: Kit, r: Run): RenderElement {
  const { Text } = k;
  return (
    <Text>
      {r.cases.map((c) => (
        <Text color={STATUS[c.status].color}>
          {c.status === "queued" ? "░░" : "██"}
        </Text>
      ))}
    </Text>
  );
}

function caseRow(
  k: Kit,
  a: Actions,
  c: TestCase,
  selected: boolean,
): RenderElement {
  const { Button, Text } = k;
  const s = STATUS[c.status];
  return (
    <Button
      key={`case-${c.id}`}
      plain
      onPress={() => a.selectCase(selected ? "" : c.id)}
    >
      <Text color={s.color}>{s.glyph} </Text>
      <Text weight={selected ? "semibold" : "regular"}>{c.name}</Text>
      <Text dimColor>
        {"  "}
        {c.group} · {c.ms ? `${c.ms} ms` : s.label}
      </Text>
    </Button>
  );
}

// ------------------------------------------------------------ the cards ----

export type CardData = {
  id: string;
  columns: number;
  collapsed: boolean;
  run: Run;
  history: RunSummary[];
  form: FormValue;
  selectedCase: string;
};

export function reportCard(k: Kit, a: Actions, d: CardData): RenderElement {
  const { Box, Text, Button, Svg } = k;
  const r = d.run;
  const t = tally(r);
  const isRunning = r.status === "running";
  const headline =
    r.status === "idle"
      ? `${t.total} not run`
      : isRunning
        ? `Running ${t.done + 1}/${t.total}`
        : t.failed > 0
          ? `${t.failed} failed`
          : `${t.passed} passed`;
  const headColor: ThemeKey =
    r.status === "idle"
      ? "text"
      : isRunning
        ? "suggestion"
        : t.failed > 0
          ? "error"
          : "success";
  const current = r.cases.find((c) => c.status === "running");

  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Kaijan UI demo · QA",
      title: "Checkout flow regression",
      collapsed: d.collapsed,
      summary: `${headline} · ${t.total} tests · run #${r.id}`,
    },
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2} alignItems="center" flexWrap="wrap">
        {Svg ? (
          <Svg
            source={donut(r, 96)}
            alt={`${t.passed} of ${t.total} passed`}
            width={96}
            height={96}
            isInteractive
          />
        ) : null}
        <Box flexDirection="column" flexGrow={1}>
          <Text size="title" weight="bold" color={headColor} tabular>
            {headline}
          </Text>
          <Text dimColor size="footnote" tabular>
            {t.total} tests · run #{r.id} · {(t.ms / 1000).toFixed(1)}s
            {current ? ` · ${current.name}` : ""}
          </Text>
          <Box flexDirection="row" gap={1} marginTop={1} flexWrap="wrap">
            {chip(k, `✓ ${t.passed} passed`, "success")}
            {chip(k, `✗ ${t.failed} failed`, "error")}
            {chip(k, `⊘ ${t.skipped} skipped`, "warning")}
          </Box>
        </Box>
      </Box>
      {Svg ? (
        <Svg
          source={progressBar(r, svgWidth(d.columns))}
          alt="Progress by test"
          isInteractive
        />
      ) : (
        textBar(k, r)
      )}
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        <Button
          key={`details-${d.id}`}
          variant="primary"
          label="Show details"
          onPress={() => a.openPane("report")}
        />
        <Button
          key={`run-${d.id}`}
          label={
            isRunning ? "Running…" : r.id === 0 ? "Run suite" : "Run again"
          }
          onPress={() => a.startRun(false)}
        />
        {t.failed > 0 && !isRunning ? (
          <Button
            key={`rerun-${d.id}`}
            label="Rerun failed"
            onPress={() => a.startRun(true)}
          />
        ) : null}
        <Button
          key={`copy-${d.id}`}
          dimColor
          label="Copy summary"
          onPress={(press) =>
            a.copy(
              `run #${r.id}: ${t.passed} passed, ${t.failed} failed`,
              press.surface,
            )
          }
        />
      </Box>
    </Box>,
  );
}

export function chartCard(k: Kit, a: Actions, d: CardData): RenderElement {
  const { Box, Text, Svg } = k;
  const w = svgWidth(d.columns);
  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Svg element",
      title: "Charts from inline SVG",
      collapsed: d.collapsed,
    },
    Svg ? (
      <Box flexDirection="column" gap={1}>
        <Text dimColor size="footnote">
          Durations per test. Hover a bar for its tooltip; bars grow in with
          SMIL animation.
        </Text>
        <Svg
          source={durationBars(d.run, w)}
          alt="Test durations"
          isInteractive
        />
        <Text dimColor size="footnote">
          Pass-rate trend across {d.history.length} run(s). Run the suite to add
          points.
        </Text>
        <Svg source={trend(d.history, w)} alt="Pass rate trend" isInteractive />
      </Box>
    ) : (
      <Box flexDirection="column">
        <Text dimColor>
          This surface has no Svg element; here is a text chart instead.
        </Text>
        {d.run.cases.map((c) => (
          <Text>
            <Text dimColor>{c.name.padEnd(36).slice(0, 36)} </Text>
            <Text color={STATUS[c.status].color}>
              {"█".repeat(Math.max(1, Math.round(c.ms / 80)))}
            </Text>
          </Text>
        ))}
      </Box>
    ),
  );
}

export function formCard(k: Kit, a: Actions, d: CardData): RenderElement {
  const { Box, Text, Button, Input, Select } = k;
  const f = d.form;
  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Input · Select",
      title: "Schedule a test run",
      collapsed: d.collapsed,
    },
    <Box flexDirection="column" gap={1}>
      {Input ? (
        <Input
          key={`project-${d.id}`}
          label="Project"
          placeholder="repo or app name"
          value={f.project}
          onInput={(value) => a.setForm((x) => ({ ...x, project: value }))}
          onSubmit={() => a.submitForm()}
        />
      ) : null}
      {Select ? (
        <Box flexDirection="row" gap={2} flexWrap="wrap">
          <Select
            key={`env-${d.id}`}
            label="Environment"
            value={f.env}
            options={[
              { value: "local", label: "Local" },
              { value: "staging", label: "Staging" },
              { value: "preview", label: "PR preview" },
            ]}
            onSelect={(value) => a.setForm((x) => ({ ...x, env: value }))}
          />
          <Select
            key={`browser-${d.id}`}
            label="Browser"
            value={f.browser}
            options={[
              { value: "chromium", label: "Chromium" },
              { value: "firefox", label: "Firefox" },
              { value: "webkit", label: "WebKit" },
            ]}
            onSelect={(value) => a.setForm((x) => ({ ...x, browser: value }))}
          />
        </Box>
      ) : null}
      {Input ? (
        <Input
          key={`notes-${d.id}`}
          label="Notes"
          rows={3}
          placeholder="Anything the run should know (multi-line)"
          value={f.notes}
          submitLabel="schedule"
          onInput={(value) => a.setForm((x) => ({ ...x, notes: value }))}
          onSubmit={() => a.submitForm()}
        />
      ) : (
        <Text dimColor>This surface draws no inputs.</Text>
      )}
      <Box flexDirection="row" gap={1}>
        <Button
          key={`submit-${d.id}`}
          variant="primary"
          label="Schedule"
          onPress={() => a.submitForm()}
        />
        <Button
          key={`reset-${d.id}`}
          label="Reset"
          onPress={() => a.resetForm()}
        />
      </Box>
      {f.submittedAt > 0 ? (
        <Box
          borderStyle="round"
          borderColor="success"
          paddingX={1}
          flexDirection="column"
        >
          <Text color="success" weight="semibold">
            ✓ Scheduled
          </Text>
          <Text dimColor size="footnote">
            {f.project} on {f.env} with {f.browser}
            {f.notes ? ` — “${f.notes.split("\n")[0]}”` : ""}
          </Text>
        </Box>
      ) : null}
    </Box>,
  );
}

const SAMPLE_TS = `export async function applyCoupon(cart: Cart, code: string) {
  const coupon = await coupons.find(code)
  if (!coupon) throw new CouponError('Unknown coupon')
  if (coupon.expiresAt < Date.now()) {
    throw new CouponError('This coupon has expired')
  }
  return cart.withDiscount(coupon.percent)
}`;

const SAMPLE_DIFF = `--- a/src/cart/coupon.ts
+++ b/src/cart/coupon.ts
@@ -12,7 +12,9 @@ export async function applyCoupon(cart: Cart, code: string) {
   const coupon = await coupons.find(code)
   if (!coupon) throw new CouponError('Unknown coupon')
-  return cart.withDiscount(coupon.percent)
+  if (coupon.expiresAt < Date.now()) {
+    throw new CouponError('This coupon has expired')
+  }
+  return cart.withDiscount(coupon.percent)
 }`;

export function codeCard(k: Kit, a: Actions, d: CardData): RenderElement {
  const { Box, Text, Button, Code } = k;
  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Code element",
      title: "Highlighted source and a diff",
      collapsed: d.collapsed,
    },
    <Box flexDirection="column" gap={1}>
      <Text dimColor size="footnote">
        language="ts", startLine=10 draws a numbered gutter:
      </Text>
      <Code source={SAMPLE_TS} language="ts" startLine={10} />
      <Text dimColor size="footnote">
        format="diff" parses unified hunks:
      </Text>
      <Code source={SAMPLE_DIFF} format="diff" path="src/cart/coupon.ts" />
      <Box flexDirection="row" gap={1}>
        <Button
          key={`copycode-${d.id}`}
          label="Copy code"
          onPress={(p) => a.copy(SAMPLE_TS, p.surface)}
        />
        <Button
          key={`fill-${d.id}`}
          label="Put a question in the prompt"
          onPress={() =>
            a.fillPrompt("Review the expired-coupon fix in src/cart/coupon.ts")
          }
        />
      </Box>
    </Box>,
  );
}

export const MD_LINK_PANE = "https://kaijan.example/pane/gallery";
export const MD_LINK_RUN = "https://kaijan.example/run";

const SAMPLE_MD = `### Release checklist

The **Markdown** element draws exactly like an assistant reply:

1. Run the [regression suite](${MD_LINK_RUN}) — this link is answered by the mod
2. Open the [component gallery](${MD_LINK_PANE}) in the side pane
3. Read the [Claude Code docs](https://code.claude.com/docs) — opens normally

| Area | Owner | State |
| --- | --- | --- |
| Cart | Mai | ✅ green |
| Payment | Lan | ⚠️ flaky 3DS |

> Quotes, \`inline code\`, ~~strikethrough~~ and fenced code all work:

\`\`\`bash
npx playwright test --project=chromium
\`\`\``;

export function markdownCard(k: Kit, a: Actions, d: CardData): RenderElement {
  const { Box, Markdown, Link, Text } = k;
  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Markdown · Link",
      title: "Rich text with answerable links",
      collapsed: d.collapsed,
    },
    <Box flexDirection="column" gap={1}>
      <Markdown
        key={`md-${d.id}`}
        text={SAMPLE_MD}
        pressableLinks={[MD_LINK_PANE, MD_LINK_RUN]}
        onLinkPress={(link) => {
          if (link.href === MD_LINK_RUN) a.startRun(false);
          else a.openPane("gallery");
        }}
      />
      <Text>
        <Text dimColor>A plain Link element: </Text>
        <Link
          href="https://code.claude.com/docs"
          label="code.claude.com/docs"
        />
      </Text>
    </Box>,
  );
}

export function menuCard(
  k: Kit,
  a: Actions,
  d: { id: string; columns: number },
): RenderElement {
  const { Box, Text, Button } = k;
  const tiles: { kind: CardKind; hint: string }[] = [
    { kind: "report", hint: "stats, donut, live run" },
    { kind: "chart", hint: "SVG charts, tooltips" },
    { kind: "form", hint: "inputs and selects" },
    { kind: "code", hint: "code, diff, prompt fill" },
    { kind: "markdown", hint: "markdown, links" },
    { kind: "live", hint: "self-animating client" },
  ];
  return (
    <Box
      key={`menu-${d.id}`}
      flexDirection="column"
      borderStyle="round"
      borderColor="claude"
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      {eyebrow(k, "Claude Code mod")}
      <Text size="title" weight="bold">
        Kaijan UI demo
      </Text>
      <Text dimColor>
        Everything a mod can draw. Each button places an inline card in the
        transcript; the side pane holds the full gallery. Hover this card.
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {tiles.map((t) => (
          <Button
            key={`place-${t.kind}-${d.id}`}
            onPress={() => a.place(t.kind)}
          >
            {CARD_LABELS[t.kind]} <Text dimColor>{t.hint}</Text>
          </Button>
        ))}
      </Box>
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        <Button
          key={`pane-${d.id}`}
          variant="primary"
          label="Open side panel"
          onPress={() => a.openPane("gallery")}
        />
        <Button
          key={`runm-${d.id}`}
          label="Run the demo suite"
          onPress={() => a.startRun(false)}
        />
        <Button
          key={`askclaude-${d.id}`}
          label="Ask Claude to draw a card"
          onPress={() =>
            a.submitPrompt(
              "Use the kaijan show_mod_card tool to show me the report card, then call run_mod_suite and summarise the result.",
            )
          }
        />
      </Box>
      <Box key={`menu-hover-${d.id}`} flexDirection="row">
        <Text dimColor hover={{ color: "claude", dimColor: false }}>
          ◆ Tip: this line lights up while the pointer is over it (hover styles
          run in the surface, no hook).
        </Text>
      </Box>
    </Box>
  );
}

export function liveCard(
  k: Kit,
  a: Actions,
  d: CardData,
  client: RenderElement | null,
): RenderElement {
  const { Box, Text } = k;
  return cardShell(
    k,
    a,
    {
      id: d.id,
      eyebrow: "Client element",
      title: "A live region with its own frame clock",
      collapsed: d.collapsed,
    },
    <Box flexDirection="column" gap={1}>
      <Text dimColor size="footnote">
        Runs on the drawing thread: animates without any hook, reads keys and
        the pointer, and posts laps back to the mod.
      </Text>
      {client ?? (
        <Text color="warning">
          This surface draws no Client (desktop and terminal only).
        </Text>
      )}
    </Box>,
  );
}

// ------------------------------------------------------------- the pane ----

export type PaneData = {
  columns: number;
  isFocused: boolean;
  tab: PaneTab;
  filter: CaseFilter;
  selectedCase: string;
  run: Run;
  history: RunSummary[];
  form: FormValue;
  echo: string;
  counter: number;
  laps: number[];
  theme: ThemeName;
  band: boolean;
  lastAction: string;
};

function tabBar(k: Kit, a: Actions, d: PaneData): RenderElement {
  const { Box, Button } = k;
  const tabs = Object.keys(TAB_LABELS) as PaneTab[];
  return (
    <Box flexDirection="row" gap={1} flexWrap="wrap">
      {tabs.map((t, i) => (
        <Button
          key={`tab-${t}`}
          hotkey={String(i + 1)}
          variant={d.tab === t ? "primary" : "secondary"}
          label={
            t === "report"
              ? `${TAB_LABELS[t]} ${d.run.cases.length}`
              : TAB_LABELS[t]
          }
          onPress={() => a.setTab(t)}
        />
      ))}
    </Box>
  );
}

function section(
  k: Kit,
  title: string,
  hint: string,
  body: RenderChildren,
): RenderElement {
  const { Box, Text } = k;
  return (
    <Box flexDirection="column" gap={1} marginTop={1}>
      <Box flexDirection="column">
        <Text size="heading" weight="semibold">
          {title}
        </Text>
        <Text dimColor size="footnote">
          {hint}
        </Text>
      </Box>
      {body}
    </Box>
  );
}

function reportTab(k: Kit, a: Actions, d: PaneData): RenderChildren {
  const { Box, Text, Button, Code, Svg } = k;
  const r = d.run;
  const t = tally(r);
  const list = visibleCases(r, d.filter);
  const sel = r.cases.find((c) => c.id === d.selectedCase);
  const groups = [...new Set(r.cases.map((c) => c.group))];
  return [
    <Box
      borderStyle="round"
      borderColor="subtle"
      paddingX={2}
      paddingY={1}
      flexDirection="row"
      gap={2}
      alignItems="center"
    >
      {Svg ? (
        <Svg
          source={donut(r, 72)}
          alt="pass rate"
          width={72}
          height={72}
          isInteractive
        />
      ) : null}
      <Box flexDirection="column">
        <Text
          size="heading"
          weight="bold"
          color={
            t.failed > 0 ? "error" : r.status === "idle" ? "text" : "success"
          }
        >
          {r.status === "idle"
            ? `${t.total} not run`
            : `${t.passed} passed · ${t.failed} failed`}
        </Text>
        <Text dimColor size="footnote" tabular>
          {t.total} functional tests · {d.history.length} runs · {r.status}
        </Text>
      </Box>
    </Box>,
    <Box flexDirection="row" gap={1} flexWrap="wrap">
      {(["all", "passed", "failed"] as const).map((f) => (
        <Button
          key={`filter-${f}`}
          {...(d.filter === f
            ? { variant: "primary" as const }
            : { plain: true as const })}
          label={`${f[0]?.toUpperCase()}${f.slice(1)} ${f === "all" ? t.total : f === "passed" ? t.passed : t.failed}`}
          onPress={() => a.setFilter(f)}
        />
      ))}
      <Button
        key="pane-run"
        label={r.status === "running" ? "Running…" : "Run suite"}
        onPress={() => a.startRun(false)}
      />
      <Button
        key="pane-reset"
        dimColor
        label="Reset"
        onPress={() => a.resetRun()}
      />
    </Box>,
    ...groups.map((g) => {
      const rows = list.filter((c) => c.group === g);
      if (rows.length === 0) return null;
      return (
        <Box flexDirection="column">
          <Text weight="semibold">
            ▾ {g} <Text dimColor>· {rows.length} tests</Text>
          </Text>
          <Box flexDirection="column" paddingLeft={2}>
            {rows.map((c) => caseRow(k, a, c, c.id === d.selectedCase))}
          </Box>
        </Box>
      );
    }),
    sel ? (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={STATUS[sel.status].color}
        paddingX={1}
        gap={1}
      >
        <Text weight="semibold">
          <Text color={STATUS[sel.status].color}>
            {STATUS[sel.status].glyph}
          </Text>{" "}
          {sel.name}
        </Text>
        <Box flexDirection="column">
          {sel.steps.map((s, i) => (
            <Text>
              <Text dimColor>{i + 1}. </Text>
              {s}
            </Text>
          ))}
        </Box>
        {sel.error ? <Code source={sel.error} language="text" /> : null}
      </Box>
    ) : (
      <Text dimColor size="footnote">
        Click a test row to see its steps.
      </Text>
    ),
    section(
      k,
      "Runs",
      "One row per finished run.",
      d.history.length === 0 ? (
        <Text dimColor>No runs yet.</Text>
      ) : (
        <Box flexDirection="column">
          {[...d.history].reverse().map((summary) => (
            <Text tabular>
              <Text weight="medium">#{summary.id}</Text>
              <Text color="success"> {summary.passed}✓</Text>
              <Text color="error"> {summary.failed}✗</Text>
              <Text color="warning"> {summary.skipped}⊘</Text>
              <Text dimColor> {(summary.ms / 1000).toFixed(1)}s</Text>
            </Text>
          ))}
        </Box>
      ),
    ),
  ];
}

function galleryTab(k: Kit, a: Actions, d: PaneData): RenderChildren {
  const { Box, Text, Button, Code, Markdown, Link, Svg } = k;
  const colors: ThemeKey[] = [
    "text",
    "subtle",
    "inactive",
    "claude",
    "success",
    "error",
    "warning",
    "suggestion",
    "permission",
    "planMode",
    "autoAccept",
    "merged",
    "ide",
    "remember",
  ];
  const borders = ["round", "single", "double", "bold", "dashed", "classic"];
  return [
    section(
      k,
      "Typography",
      "Text: size, weight, style, mono, tabular digits.",
      <Box flexDirection="column">
        <Text size="title" weight="bold">
          Title · bold
        </Text>
        <Text size="heading" weight="semibold">
          Heading · semibold
        </Text>
        <Text size="body">Body · regular</Text>
        <Text size="footnote" weight="medium">
          Footnote · medium
        </Text>
        <Text size="caption" dimColor>
          Caption · dimColor
        </Text>
        <Text>
          <Text italic>italic</Text> · <Text underline>underline</Text> ·{" "}
          <Text strikethrough>strike</Text> · <Text inverse> inverse </Text> ·{" "}
          <Text mono>mono()</Text> · <Text tabular>0123456789</Text>
        </Text>
        <Text wrap="truncate-middle">
          truncate-middle:
          a/very/long/path/that/would/not/fit/inside/a/narrow/side/pane/at/all/component.tsx
        </Text>
      </Box>,
    ),
    section(
      k,
      "Theme colours",
      "Theme keys follow the app theme; raw hex also works.",
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {colors.map((c) => (
          <Text color={c}>● {c}</Text>
        ))}
        <Text color="#ff79c6">● #ff79c6</Text>
        <Text backgroundColor="claude" color="inverseText">
          {" "}
          bg: claude{" "}
        </Text>
        <Text backgroundColor="success" color="inverseText">
          {" "}
          bg: success{" "}
        </Text>
      </Box>,
    ),
    section(
      k,
      "Boxes & borders",
      "borderStyle, borderColor, padding, gap, flex direction and wrapping.",
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {borders.map((b, i) => (
          <Box
            borderStyle={b}
            borderColor={colors[(i % 6) + 3] ?? "subtle"}
            paddingX={1}
          >
            <Text>{b}</Text>
          </Box>
        ))}
        <Box backgroundColor="claude" paddingX={1}>
          <Text color="inverseText">backgroundColor</Text>
        </Box>
      </Box>,
    ),
    section(
      k,
      "Buttons",
      'variant, plain, dimColor, hotkey, role="dismiss", children with chips.',
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          <Button
            key="g-primary"
            variant="primary"
            label="Primary"
            onPress={() => a.toast("Primary pressed")}
          />
          <Button
            key="g-secondary"
            variant="secondary"
            label="Secondary"
            onPress={() => a.toast("Secondary pressed")}
          />
          <Button
            key="g-dim"
            dimColor
            label="Dim"
            onPress={() => a.toast("Dim pressed")}
          />
          <Button
            key="g-plain"
            plain
            hotkey="p"
            label="Plain with hotkey p"
            onPress={() => a.toast("Plain pressed (p)")}
          />
          <Button
            key="g-dismiss"
            role="dismiss"
            label="Dismiss"
            onPress={() => a.toast("Dismiss pressed")}
          />
        </Box>
        <Button
          key="g-row"
          plain
          onPress={() => a.toast("A whole row is one Button")}
        >
          📄 checkout.spec.ts <Text dimColor>· 8 tests · 2m ago</Text>{" "}
          <Text color="success">passing</Text>
        </Button>
      </Box>,
    ),
    section(
      k,
      "Hover",
      "Styles, reveals and an absolutely placed card, all drawn by the surface with no hook.",
      <Box flexDirection="column" gap={1}>
        <Box
          key="hv-style"
          borderStyle="round"
          borderColor="subtle"
          paddingX={1}
          hover={{ borderColor: "claude", backgroundColor: "subtle" }}
        >
          <Text hover={{ color: "claude", bold: true }}>
            Hover me: border, background and text change
          </Text>
        </Box>
        <Box key="hv-reveal" flexDirection="row" gap={1}>
          <Text>Hover to reveal actions →</Text>
          <Box
            display="none"
            hover={{ display: "flex" }}
            flexDirection="row"
            gap={1}
          >
            <Button
              key="hv-a"
              plain
              label="✎ edit"
              onPress={() => a.toast("Edit")}
            />
            <Button
              key="hv-b"
              plain
              label="🗑 delete"
              onPress={() => a.toast("Delete")}
            />
          </Box>
        </Box>
        <Box key="hv-tip" flexDirection="row">
          <Text underline>Hover for a tooltip card</Text>
          <Box
            position="absolute"
            top={1}
            left={4}
            display="none"
            hover={{ display: "flex" }}
            borderStyle="round"
            borderColor="claude"
            backgroundColor="inverseText"
            paddingX={1}
          >
            <Text>I float over what is below me.</Text>
          </Box>
        </Box>
        <Text hover={{ scope: "shared", color: "claude", underline: true }}>
          Scoped group: this lights up together with the band's ◆ mark
        </Text>
      </Box>,
    ),
    section(
      k,
      "Media",
      "Svg (desktop/vscode/mobile), Code, Markdown, Link.",
      <Box flexDirection="column" gap={1}>
        {Svg ? (
          <Svg
            source={trend(d.history, svgWidth(d.columns))}
            alt="trend"
            isInteractive
          />
        ) : (
          <Text dimColor>No Svg here.</Text>
        )}
        <Code
          source={'const answer = await $.ui.open({ id: "showcase" })'}
          language="ts"
        />
        <Markdown
          text={
            "**Markdown** with `code`, _emphasis_ and a [link](https://code.claude.com/docs)."
          }
        />
        <Link href="https://code.claude.com/docs" label="A Link element" />
      </Box>,
    ),
  ];
}

function controlsTab(k: Kit, a: Actions, d: PaneData): RenderChildren {
  const { Box, Text, Button, Input, Select } = k;
  return [
    section(
      k,
      "Input",
      "onInput fires per keystroke, onSubmit on Enter.",
      Input ? (
        <Box flexDirection="column" gap={1}>
          <Input
            key="c-echo"
            label="Type"
            placeholder="type here, it echoes live"
            value={d.echo}
            onInput={(v) => a.setEcho(v)}
            onSubmit={(v) => a.toast(`Submitted: ${v || "(empty)"}`)}
          />
          <Text dimColor>
            echo: <Text color="claude">{d.echo || "…"}</Text> · {d.echo.length}{" "}
            chars
          </Text>
        </Box>
      ) : (
        <Text dimColor>No Input on this surface.</Text>
      ),
    ),
    section(
      k,
      "Select",
      "A picker; the pick runs onSelect.",
      Select ? (
        <Select
          key="c-filter"
          label="Report filter"
          value={d.filter}
          options={[
            { value: "all", label: "All tests" },
            { value: "passed", label: "Passed only" },
            { value: "failed", label: "Failed only" },
          ]}
          onSelect={(v) =>
            a.setFilter(v === "passed" || v === "failed" ? v : "all")
          }
        />
      ) : (
        <Text dimColor>No Select on this surface.</Text>
      ),
    ),
    section(
      k,
      "Counter",
      "State in $.state redraws every reader. Focus the pane, then press + or - hotkeys (a / s).",
      <Box flexDirection="row" gap={1} alignItems="center">
        <Button key="c-dec" hotkey="s" label="−" onPress={() => a.bump(-1)} />
        <Text size="title" weight="bold" tabular>
          {String(d.counter).padStart(3, " ")}
        </Text>
        <Button
          key="c-inc"
          hotkey="a"
          variant="primary"
          label="+"
          onPress={() => a.bump(1)}
        />
      </Box>,
    ),
    section(
      k,
      "Feedback",
      "Try messages and prompt controls. Sending a prompt starts a Claude turn.",
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        <Button
          key="f-toast"
          label="Toast"
          onPress={() => a.toast("Hello from a toast 👋")}
        />
        <Button
          key="f-status"
          label="Pin status line"
          onPress={() =>
            a.status("kaijan: status pinned under the prompt")
          }
        />
        <Button
          key="f-unstatus"
          dimColor
          label="Clear status"
          onPress={() => a.status(undefined)}
        />
        <Button
          key="f-notify"
          label="OS notification"
          onPress={() => a.notify("This is a native notification from the mod")}
        />
        <Button key="f-ask" label="Ask dialog" onPress={() => a.ask()} />
        <Button
          key="f-log"
          label="Transcript log line"
          onPress={() =>
            a.log(
              "kaijan: a dim notice row, never sent to the model",
            )
          }
        />
        <Button
          key="f-copy"
          label="Copy to clipboard"
          onPress={(p) => a.copy("Copied by kaijan", p.surface)}
        />
        <Button
          key="f-fill"
          label="Fill the prompt"
          onPress={() =>
            a.fillPrompt(
              "Hello from the kaijan mod — edit me, then send.",
            )
          }
        />
        <Button
          key="f-submit"
          variant="primary"
          label="Send a prompt to Claude"
          onPress={() =>
            a.submitPrompt(
              'Call the kaijan show_mod_card tool with kind "chart".',
            )
          }
        />
        <Button
          key="f-end"
          dimColor
          label="Scroll pane to end"
          onPress={() => a.scrollPaneEnd()}
        />
      </Box>,
    ),
    section(
      k,
      "Place inline cards",
      "$.ui.place adds a row to the transcript that this mod draws.",
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {CARD_KINDS.map((kind) => (
          <Button
            key={`c-place-${kind}`}
            label={CARD_LABELS[kind]}
            onPress={() => a.place(kind)}
          />
        ))}
      </Box>,
    ),
    <Text dimColor size="caption">
      — end of controls —
    </Text>,
  ];
}

function liveTab(
  k: Kit,
  a: Actions,
  d: PaneData,
  client: RenderElement | null,
): RenderChildren {
  const { Box, Text, Button } = k;
  return [
    section(
      k,
      "Client module",
      "hooks/mod-demo/live.tsx draws this at its own frame rate. Click it, then press space (start/stop), l (lap), r (reset). Move the pointer over it.",
      client ?? <Text color="warning">This surface draws no Client.</Text>,
    ),
    section(
      k,
      "Laps posted to the mod",
      "surface.post() → ui.message hook → $.state → this list.",
      d.laps.length === 0 ? (
        <Text dimColor>No laps yet.</Text>
      ) : (
        <Box flexDirection="column">
          {d.laps.map((ms, i) => (
            <Text tabular>
              <Text dimColor>Lap {String(i + 1).padStart(2, "0")} </Text>
              {(ms / 1000).toFixed(2)}s
            </Text>
          ))}
          <Button
            key="laps-clear"
            dimColor
            label="Clear laps"
            onPress={() => a.toast("Laps clear on reset in the client")}
          />
        </Box>
      ),
    ),
  ];
}

function themeTab(k: Kit, a: Actions, d: PaneData): RenderChildren {
  const { Box, Text, Button, Select } = k;
  return [
    section(
      k,
      "Backdrop",
      "$.theme.set draws an SVG behind the whole conversation with frosted panels (desktop and mobile apps).",
      <Box flexDirection="column" gap={1}>
        {Select ? (
          <Select
            key="t-theme"
            label="Backdrop"
            value={d.theme}
            options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
            onSelect={(v) =>
              a.setTheme(
                v === "aurora" || v === "grid" || v === "sunset" ? v : "off",
              )
            }
          />
        ) : null}
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {THEMES.map((t) => (
            <Button
              key={`t-${t.value}`}
              {...(d.theme === t.value ? { variant: "primary" as const } : {})}
              label={t.label}
              onPress={() => a.setTheme(t.value)}
            />
          ))}
        </Box>
      </Box>,
    ),
    section(
      k,
      "Band above the prompt",
      "The AbovePrompt site: one row of status and buttons over the input box.",
      <Button
        key="t-band"
        label={d.band ? "Hide the band" : "Show the band"}
        onPress={() => a.setBand(!d.band)}
      />,
    ),
    section(
      k,
      "Last action",
      "Shared state every site reads.",
      <Text color="claude">{d.lastAction || "—"}</Text>,
    ),
  ];
}

export function pane(
  k: Kit,
  a: Actions,
  d: PaneData,
  client: RenderElement | null,
): RenderElement {
  const { Box, Text } = k;
  const body =
    d.tab === "report"
      ? reportTab(k, a, d)
      : d.tab === "gallery"
        ? galleryTab(k, a, d)
        : d.tab === "controls"
          ? controlsTab(k, a, d)
          : d.tab === "live"
            ? liveTab(k, a, d, client)
            : themeTab(k, a, d);
  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="column">
        {eyebrow(k, "Kaijan UI demo")}
        <Text size="title" weight="bold">
          {d.tab === "report"
            ? "Checkout flow regression"
            : `Mod ${TAB_LABELS[d.tab].toLowerCase()}`}
        </Text>
      </Box>
      {tabBar(k, a, d)}
      {body}
      {d.isFocused ? null : (
        <Text dimColor size="caption">
          Tip: click the pane (or ctrl+x tab) to use hotkeys 1–5 for tabs.
        </Text>
      )}
    </Box>
  );
}

export type BandData = {
  run: Run;
  lastAction: string;
  isWorking: boolean;
  columns: number;
};

export function bandRow(k: Kit, a: Actions, d: BandData): RenderElement {
  const { Box, Text, Button } = k;
  const t = tally(d.run);
  const runText =
    d.run.status === "idle"
      ? "suite not run"
      : d.run.status === "running"
        ? `run #${d.run.id} ${t.done}/${t.total}…`
        : `run #${d.run.id}: ${t.passed}✓ ${t.failed}✗`;
  return (
    <Box flexDirection="row" gap={1} alignItems="center" flexWrap="wrap">
      <Text color="claude" hover={{ scope: "shared", underline: true }}>
        ◆ Kaijan UI demo
      </Text>
      <Text dimColor>· {runText}</Text>
      {d.lastAction ? (
        <Text dimColor wrap="truncate-end">
          · {d.lastAction}
        </Text>
      ) : null}
      <Button
        key="band-pane"
        plain
        hotkey="o"
        label="open panel"
        onPress={() => a.openPane()}
      />
      <Button
        key="band-card"
        plain
        hotkey="c"
        label="report card"
        onPress={() => a.place("report")}
      />
      <Button
        key="band-hide"
        plain
        dimColor
        hotkey="h"
        label="hide"
        onPress={() => a.setBand(false)}
      />
    </Box>
  );
}
