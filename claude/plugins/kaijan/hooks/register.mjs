import { nativeReport, resultCaption } from "./report-model.mjs";
import { reportToolPrefix, reportServer } from "./report-config.mjs";
import { reportCard, reportPane } from "./report-view.mjs";
import { createReportForms } from "./inline-forms.mjs";

const paneId = "kaijan-report";
const formPaneId = "kaijan-form";
const reportTools = new Set([
  "loki_report_show",
  "loki_report_open",
  "loki_report_get",
  "kaijan_project_history",
]);
const isReportTool = (name) =>
  typeof name === "string" &&
  name.startsWith(reportToolPrefix) &&
  reportTools.has(name.slice(reportToolPrefix.length));

async function findCard($, call, id, state) {
  if (!state.isCurrent()) return undefined;
  const history = call.tool === `${reportToolPrefix}kaijan_project_history`;
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
            recoverHistory ? "kaijan_project_history" : "loki_report_get",
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
    openForm: (kind) =>
      $.ui.open({
        id: formPaneId,
        title: kind === "issue" ? "Report a Kaijan issue" : "Kaijan feedback",
        focus: true,
        columns: 64,
        rows: 28,
      }),
    closeForm: () => $.ui.close({ id: formPaneId }),
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
  const cardState = () => {
    const current = generation;
    return { cards, reads, isCurrent: () => active && current === generation };
  };

  const drawCard = (host, e, card, id, state) => {
    const open = async () => {
      if (!state.isCurrent() || card.opening) return;
      if (
        (e.surface === "desktop" || e.surface === "terminal") &&
        !card.projectHistory
      ) {
        card.opening = true;
        try {
          const result = await forms.request(host, {
            kind: "report",
            operation: e.surface === "desktop" ? "preview" : "launch",
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
          if (e.surface === "desktop") card.detailUrl = result.url;
          host.redraw();
          return;
        } catch {
          if (!state.isCurrent()) return;
          card.detailUrl = undefined;
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
      forms.actions(host, id, state.isCurrent),
      e.surface === "desktop" ? card.detailUrl : undefined,
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
    cards.clear();
    reads.clear();
    grouped.clear();
    expanded.clear();
    await forms.close();
    draftTools.clear();
    for (const [kind, description] of [
      [
        "feedback",
        "Open the requested private Kaijan feedback draft in Claude. The person writes, reviews, and sends it from the form. This tool sends nothing.",
      ],
      [
        "issue",
        "Open the requested Kaijan issue draft for review in Claude. The person can edit the draft and choose images before confirming publication. This tool publishes nothing.",
      ],
    ]) {
      const { tool } = await $.tool.register({
        name: `open_kaijan_${kind}_draft`,
        description,
        inputSchema: {
          type: "object",
          properties: {},
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
    cards.clear();
    reads.clear();
    grouped.clear();
    expanded.clear();
    draftTools.clear();
    await forms.close();
    await $.ui.close({ id: paneId });
    await $.ui.close({ id: formPaneId });
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
        state.isCurrent,
      );
      if (!opened) return { deny: "Kaijan could not open the draft form." };
      return { result: "Opened the draft for user review." };
    },
  );
  on(
    "tool.call",
    {
      tool: /^mcp__plugin_kaijan(?:-qa|-local)?_kaijan_local__(?:loki_report_(?:show|open|get)|kaijan_project_history)$/,
    },
    async ($, e, next) => {
      const current = generation;
      const answer = await next(e);
      if (
        !e.agentId &&
        isReportTool(e.tool) &&
        (e.tool !== `${reportToolPrefix}kaijan_project_history` ||
          e.operation === "read") &&
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
            output = await $.mcp.call(reportServer, "loki_report_get", {
              reportId: e.reportId,
            });
            report = nativeReport(output);
            if (report?.id !== e.reportId) report = undefined;
          }
          if (report && current === generation) {
            cards.set(e.tool_use_id, {
              output,
              report,
              projectHistory:
                e.tool === `${reportToolPrefix}kaijan_project_history`,
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
    const matches = [];
    for (const call of e.props.calls) {
      if (!isReportTool(call.tool) || call.isErrored || call.isRunning)
        continue;
      const card = await findCard($, call, call.tool_use_id, state);
      if (!state.isCurrent()) return next(e);
      if (card) {
        const id = call.tool_use_id ?? `${e.requestId}-${card.report.id}`;
        grouped.add(id);
        matches.push({ card, id });
      }
    }
    const original = await next(e);
    if (!state.isCurrent() || !matches.length) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [
        original,
        ...matches.map(({ card, id }) =>
          drawCard(reportHost($, e), e, card, id, state),
        ),
      ],
    });
  });
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    const state = cardState();
    if (!state.isCurrent()) return next(e);
    const original = await next(e);
    if (
      !state.isCurrent() ||
      grouped.has(e.requestId) ||
      !isReportTool(e.props.tool) ||
      e.props.isErrored ||
      e.props.isRunning
    )
      return original;
    const card = await findCard($, e.props, e.requestId, state);
    if (!state.isCurrent() || !card) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [
        original,
        drawCard(reportHost($, e), e, card, e.requestId, state),
      ],
    });
  });
  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId === formPaneId && active)
      return forms.view(reportHost($, e), cardState().isCurrent) ?? next(e);
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
