import { nativeReport, resultCaption } from "./report-model.mjs";
import { reportToolPrefix, reportServer } from "./report-config.mjs";
import { reportCard, reportPane } from "./report-view.mjs";
import { createReportForms } from "./inline-forms.mjs";
import {
  operationToolName,
  publicToolName,
} from "./mcp-tool-names.mjs";

const paneId = "kaijan-report";
const terminalForm = "kaijan-terminal-form";
const reportTools = new Set([
  "loki_report_show",
  "loki_report_open",
  "loki_report_get",
  "kaijan_project_history",
]);
const reportOperation = (name) =>
  typeof name === "string" && name.startsWith(reportToolPrefix)
    ? operationToolName(name.slice(reportToolPrefix.length))
    : undefined;
const isReportTool = (name) => reportTools.has(reportOperation(name));
const isProjectHistory = (name) =>
  reportOperation(name) === "kaijan_project_history";
const reportCallNames = [
  ...new Set([...reportTools, ...Array.from(reportTools, publicToolName)]),
].map((name) => reportToolPrefix + name);

function browserResult(result) {
  if (result?.isError || !Array.isArray(result?.content)) return undefined;
  for (const block of result.content) {
    if (block.type !== "text" || !block.text?.trimStart().startsWith("{"))
      continue;
    // Claude appends a human-readable note after the JSON result.
    try {
      return JSON.parse(block.text.slice(0, block.text.lastIndexOf("}") + 1));
    } catch {
      continue;
    }
  }
}

async function findCard($, call, id, state) {
  if (!state.isCurrent()) return undefined;
  const history = isProjectHistory(call.tool);
  if (history && call.input?.operation !== "read") return undefined;
  const { cards, reads } = state;
  const saved =
    cards.get(call.tool_use_id ?? id) ??
    [...cards.values()].find((card) => card.report.id === call.input?.reportId);
  if (saved) return saved;
  let output = call.output;
  let report = nativeReport(output);
  const reportId = call.input?.reportId;
  const entryId = history ? call.input?.entryId : undefined;
  const recoverHistory =
    typeof entryId === "string" && /^[a-f0-9]{64}$/.test(entryId);
  // A resumed transcript can retain only the truncated tool text. Recover
  // that exact saved report through its existing bound reader, once per view.
  if (
    !report &&
    (recoverHistory ||
      (typeof reportId === "string" && /^[a-f0-9]{64}$/.test(reportId)))
  ) {
    const readKey = recoverHistory ? `history:${entryId}` : reportId;
    if (!reads.has(readKey))
      reads.set(
        readKey,
        $.mcp
          .call(
            reportServer,
            publicToolName(
              recoverHistory ? "kaijan_project_history" : "loki_report_get",
            ),
            recoverHistory ? { operation: "read", entryId } : { reportId },
          )
          .catch(() => undefined),
      );
    output = await reads.get(readKey);
    report = nativeReport(output);
    if (!recoverHistory && report?.id !== reportId) return undefined;
  }
  if (!state.isCurrent() || !report) return undefined;
  const card = { output, report, projectHistory: history };
  cards.set(call.tool_use_id ?? id, card);
  return card;
}

function reportHost($, e) {
  return {
    elements: e ? $.ui.resolve(e) : undefined,
    terminal: e?.surface === "terminal",
    desktop: e?.surface === "desktop",
    sessionId: () => $.session.id(),
    start: (thread) =>
      $.process.spawn({
        argv: [
          `${$.plugin.root}/capabilities/runtime/node`,
          `${$.plugin.root}/scripts/private-parameters.mjs`,
          "--inline-forms",
          thread,
        ],
      }),
    fetch: (options) => $.http.fetch("http://localhost/form", options),
    submit: (text) => $.prompt.submit({ text, asUser: true }),
    copy: (text) => $.ui.copy({ text, surface: e?.surface }),
    browser: (tool, input) =>
      $.mcp.call("Claude Browser", tool, input).catch(() => undefined),
    warnForm: () => $.ui.log("Kaijan could not open the draft. Try again."),
    redraw: () => $.ui.invalidate("ui.render"),
    warn: () =>
      $.ui.log(
        "Kaijan could not open the HTML report. Showing the saved details in Claude.",
      ),
    open: () =>
      $.ui.open({
        id: paneId,
        title: "Kaijan report",
        focus: true,
        closeOnEscape: true,
        columns: 64,
        rows: 28,
      }),
  };
}

/** Display saved reports. Truncated results use only the same bound report or
 * authorized project-history entry from this plugin's connected Local server. */
export function register(on, runInterruption) {
  const forms = createReportForms();
  let generation = 0;
  let active = true;
  let selected;
  let tab = "tests";
  const expanded = new Set();
  const cards = new Map();
  const reads = new Map();
  const grouped = new Set();
  const draftTools = new Map();
  let reportBrowser = {};
  const cardState = () => {
    const current = generation;
    return {
      cards,
      reads,
      reportBrowser,
      isCurrent: () => active && current === generation,
    };
  };

  const openBrowserReport = async (host, url, state) => {
    const browser = state.reportBrowser;
    const origin = new URL(url).origin;
    if (browser.tabId) {
      const context = browserResult(await host.browser("tabs_context", {}));
      if (!state.isCurrent()) return false;
      // Reuse only a tab Kaijan opened which still points at the report server.
      const savedTab = Array.isArray(context?.tabs)
        ? context.tabs.find(
            (tab) => tab.tabId === browser.tabId && tab.origin === origin,
          )
        : undefined;
      if (savedTab) {
        const navigation = await host.browser("navigate", {
          tabId: savedTab.tabId,
          url,
        });
        if (!state.isCurrent()) return false;
        if (navigation && !navigation.isError) {
          if (savedTab.isActive) return true;
          const selected = await host.browser("tabs_select", {
            tabId: savedTab.tabId,
          });
          if (selected && !selected.isError) return true;
        }
      }
    }
    const opened = browserResult(await host.browser("preview_start", { url }));
    if (!state.isCurrent() || opened?.navOk !== true) return false;
    browser.tabId = opened.tabId;
    return true;
  };

  const drawCard = async (host, e, card, id, state) => {
    const desktop = e.surface === "desktop" && !card.projectHistory;
    if (desktop) {
      card.detailsLink ??= forms
        .request(host, {
          kind: "report",
          operation: "link",
          reportId: card.report.id,
        })
        .then(({ reportId, url }) => {
          if (
            reportId !== card.report.id ||
            typeof url !== "string" ||
            !/^http:\/\/127\.0\.0\.1:\d{1,5}\/[a-f0-9]{64}\/$/.test(url)
          )
            throw Error("Unexpected report link");
          return url;
        })
        .catch(() => {
          card.detailsLink = undefined;
          return undefined;
        });
    }
    const detailsLink = desktop ? await card.detailsLink : undefined;
    if (!state.isCurrent()) return undefined;
    const open = async () => {
      if (!state.isCurrent() || card.opening) return;
      if (detailsLink) {
        const browser = state.reportBrowser;
        if (browser.opening) return;
        browser.opening = true;
        try {
          const opened = await openBrowserReport(host, detailsLink, state);
          if (!state.isCurrent()) return;
          const useBrowserLink = !opened;
          if (Boolean(card.useBrowserLink) !== useBrowserLink) {
            card.useBrowserLink = useBrowserLink;
            host.redraw();
          }
        } finally {
          browser.opening = false;
        }
        return;
      }
      if (desktop) host.warn();
      if (e.surface === "terminal" && !card.projectHistory) {
        card.opening = true;
        try {
          const result = await forms.request(host, {
            kind: "report",
            operation: "launch",
            reportId: card.report.id,
          });
          if (!state.isCurrent()) return;
          if (
            result.reportId !== card.report.id ||
            !/^http:\/\/127\.0\.0\.1:\d{1,5}\/[a-f0-9]{64}\/(?:view\/[a-f0-9-]{36}\/)?$/.test(
              result.url,
            )
          )
            throw Error("Unexpected report output");
          host.redraw();
          return;
        } catch {
          if (!state.isCurrent()) return;
          host.warn();
        } finally {
          card.opening = false;
        }
      }
      selected = card;
      tab = "tests";
      expanded.clear();
      await host.open();
      if (state.isCurrent()) host.redraw();
    };
    return reportCard(
      host.elements,
      card,
      id,
      open,
      forms.actions(
        host,
        id,
        state.isCurrent,
        card.report.runs.length === 1 ? card.report.runs[0].id : undefined,
      ),
      card.useBrowserLink ? detailsLink : undefined,
    );
  };

  on("session.start", async ($, e, next) => {
    if (runInterruption) {
      runInterruption.active = true;
      runInterruption.generation++;
      runInterruption.current = undefined;
    }
    active = true;
    generation++;
    selected = undefined;
    reportBrowser = {};
    cards.clear();
    reads.clear();
    grouped.clear();
    expanded.clear();
    await forms.close();
    draftTools.clear();
    for (const [kind, description] of [
      [
        "feedback",
        "Open a private Kaijan feedback draft in Claude. Supply runId only when the user requested details for that exact saved Run. The person reviews and sends from the form. This tool sends nothing.",
      ],
      [
        "issue",
        "Open the requested Kaijan issue draft for review in Claude. The person can edit the draft and choose images before confirming the submission. This tool only opens the form.",
      ],
    ]) {
      const { tool } = await $.tool.register({
        name: `open_kaijan_${kind}_draft`,
        description,
        inputSchema: {
          type: "object",
          properties:
            kind === "feedback"
              ? { runId: { type: "string", pattern: "^[a-f0-9]{64}$" } }
              : {},
          additionalProperties: false,
        },
      });
      draftTools.set(tool, kind);
    }
    return next(e);
  });
  on("session.end", async ($, e, next) => {
    if (runInterruption) {
      runInterruption.active = false;
      runInterruption.generation++;
      runInterruption.current = undefined;
    }
    active = false;
    generation++;
    selected = undefined;
    reportBrowser = {};
    cards.clear();
    reads.clear();
    grouped.clear();
    expanded.clear();
    draftTools.clear();
    await forms.close();
    await $.ui.close({ id: paneId });
    return next(e);
  });
  on(
    "tool.call",
    {
      tool: /^mcp__kaijan(?:-qa|-local)?__open_kaijan_(?:feedback|issue)_draft$/,
    },
    async ($, e, next) => {
      const kind = draftTools.get(e.tool);
      if (!kind || e.agentId) return next(e);
      const state = cardState();
      const surfaces = await $.session.surfaces();
      if (!surfaces.includes("terminal") && !surfaces.includes("desktop"))
        return {
          deny: "Open the draft in an interactive Claude Code session.",
        };
      const opened = await forms.openDraft(
        reportHost($),
        e.tool_use_id,
        kind,
        surfaces.includes("desktop") ? e.tool_use_id : terminalForm,
        state.isCurrent,
        kind === "feedback" ? e.runId : undefined,
      );
      if (!opened) return { deny: "Kaijan could not open the draft form." };
      return { result: "Opened the draft for user review." };
    },
  );
  on(
    "tool.call",
    {
      tool: reportCallNames,
    },
    async ($, e, next) => {
      const current = generation;
      const answer = await next(e);
      if (
        !e.agentId &&
        isReportTool(e.tool) &&
        (!isProjectHistory(e.tool) || e.operation === "read") &&
        current === generation &&
        !answer.deny &&
        !answer.isError
      ) {
        try {
          if (!(await $.session.surfaces()).length) return answer;
          let output = answer.result;
          let report = nativeReport(output);
          // Read only the exact successful request's saved snapshot. Never
          // follow a result-file path or repeat Show/Run/assessment to recover it.
          if (
            !report &&
            typeof e.reportId === "string" &&
            /^[a-f0-9]{64}$/.test(e.reportId)
          ) {
            output = await $.mcp.call(
              reportServer,
              publicToolName("loki_report_get"),
              {
                reportId: e.reportId,
              },
            );
            report = nativeReport(output);
            if (report?.id !== e.reportId) report = undefined;
          }
          if (report && current === generation) {
            cards.set(e.tool_use_id, {
              output,
              report,
              projectHistory: isProjectHistory(e.tool),
            });
            if (cards.size > 100) cards.delete(cards.keys().next().value);
            $.ui.invalidate("ui.render");
          }
        } catch {
          // The original textual report still reaches Claude and the user.
        }
      }
      return answer;
    },
  );
  on("ui.render", { component: "ToolGroup" }, async ($, e, next) => {
    const state = cardState();
    if (!state.isCurrent()) return next(e);
    const host = reportHost($, e);
    const matches = [];
    for (const call of e.props.calls) {
      if (call.isErrored || call.isRunning) continue;
      if (draftTools.has(call.tool) && call.tool_use_id) {
        const form = forms.view(host, state.isCurrent, call.tool_use_id);
        if (form) {
          grouped.add(call.tool_use_id);
          matches.push(form);
        }
      }
      if (!isReportTool(call.tool)) continue;
      const card = await findCard($, call, call.tool_use_id, state);
      if (!state.isCurrent()) return next(e);
      if (card) {
        const id = call.tool_use_id ?? `${e.requestId}-${card.report.id}`;
        grouped.add(id);
        const rendered = await drawCard(host, e, card, id, state);
        if (rendered) matches.push(rendered);
      }
    }
    const original = await next(e);
    if (!state.isCurrent() || !matches.length) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [original, ...matches],
    });
  });
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    const state = cardState();
    if (!state.isCurrent()) return next(e);
    const original = await next(e);
    const id = e.props.tool_use_id ?? e.requestId;
    if (
      !state.isCurrent() ||
      grouped.has(id) ||
      e.props.isErrored ||
      e.props.isRunning
    )
      return original;
    const isDraft = draftTools.has(e.props.tool);
    if (!isDraft && !isReportTool(e.props.tool)) return original;
    const host = reportHost($, e);
    const { Box } = host.elements;
    if (isDraft) {
      const form = forms.view(host, state.isCurrent, id);
      return form
        ? Box({ flexDirection: "column", children: [original, form] })
        : original;
    }
    const card = await findCard($, e.props, id, state);
    if (!state.isCurrent() || !card) return original;
    const rendered = await drawCard(host, e, card, id, state);
    if (!rendered) return original;
    return Box({
      flexDirection: "column",
      children: [original, rendered],
    });
  });
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (!active || e.surface !== "terminal" || e.props.hasSurvey)
      return next(e);
    // Unlike a transcript row, this site can receive keyboard focus in Claude Code.
    const host = reportHost($, e);
    const form = forms.view(host, cardState().isCurrent, terminalForm);
    if (!form) return next(e);
    const original = await next(e);
    return original
      ? host.elements.Box({
          flexDirection: "column",
          children: [original, form],
        })
      : form;
  });
  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== paneId || !selected) return next(e);
    const redraw = () => $.ui.invalidate("ui.render");
    return reportPane($.ui.resolve(e), selected.report, {
      tab,
      expanded,
      caption: resultCaption,
      redraw,
      onClose: () => $.ui.close({ id: paneId }),
      onTab: (value) => {
        tab = value;
        redraw();
      },
      onPlan: (id) => {
        selected.report = nativeReport(selected.output, id);
        expanded.clear();
        redraw();
      },
    });
  });
}
