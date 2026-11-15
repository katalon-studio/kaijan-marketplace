import { nativeReport, resultCaption } from "./report-model.mjs";
import { reportToolPrefix, reportServer } from "./report-config.mjs";
import { reportCard, reportPane } from "./report-view.mjs";

const paneId = "kaijan-report";
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
  const card = { output, report };
  cards.set(call.tool_use_id ?? id, card);
  return card;
}

async function claimSetup($) {
  try {
    const root = $.plugin.root;
    const claim = await $.process.run([
      `${root}/capabilities/runtime/node`,
      `${root}/hooks/onboarding-state.mjs`,
      await $.session.id(),
    ]);
    if (claim.exitCode !== 0) throw Error("Setup offer unavailable");
    return JSON.parse(claim.stdout).start;
  } catch {
    $.ui.log(
      `Kaijan setup could not start automatically. Use /${$.plugin.name}:setup when you are ready.`,
    );
    return false;
  }
}

/** Display saved reports. Truncated results use only the same bound report or
 * authorized project-history entry from this plugin's connected Local server. */
export function register(on, runInterruption) {
  let generation = 0;
  let active = true;
  let fresh = false;
  let selected;
  let tab = "tests";
  const expanded = new Set();
  const cards = new Map();
  const reads = new Map();
  const grouped = new Set();
  const cardState = () => {
    const current = generation;
    return { cards, reads, isCurrent: () => active && current === generation };
  };

  on("session.start", async ($, e, next) => {
    if (runInterruption) {
      runInterruption.active = true;
      runInterruption.generation++;
      runInterruption.current = undefined;
    }
    active = true;
    const current = ++generation;
    fresh = false;
    selected = undefined;
    cards.clear();
    reads.clear();
    grouped.clear();
    expanded.clear();
    // Neither a late turn-count reply nor an offer claim may start Setup in
    // a session that ended or was replaced while the host was responding.
    const turns = await $.session.turns();
    if (!active || current !== generation) return next(e);
    fresh = turns === 0;
    if (e.isInteractive && e.surface === "terminal") {
      const isCurrent = () => active && fresh && current === generation;
      $.clock.after(0, async () => {
        if (!isCurrent() || !(await claimSetup($)) || !isCurrent()) return;
        try {
          await $.command.run({ command: `${$.plugin.name}:setup` });
        } catch {
          $.ui.log(`Use /${$.plugin.name}:setup when you are ready.`);
        }
      });
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
    await $.ui.close({ id: paneId });
    return next(e);
  });
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
            cards.set(e.tool_use_id, { output, report });
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
          reportCard($.ui.resolve(e), card, id, async () => {
            if (!state.isCurrent()) return;
            selected = card;
            tab = "tests";
            expanded.clear();
            await $.ui.open({
              id: paneId,
              title: "Kaijan report",
              focus: true,
              closeOnEscape: true,
              columns: 64,
              rows: 28,
            });
            if (state.isCurrent()) $.ui.invalidate("ui.render");
          }),
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
        reportCard($.ui.resolve(e), card, e.requestId, async () => {
          if (!state.isCurrent()) return;
          selected = card;
          tab = "tests";
          expanded.clear();
          await $.ui.open({
            id: paneId,
            title: "Kaijan report",
            focus: true,
            closeOnEscape: true,
            columns: 64,
            rows: 28,
          });
          if (state.isCurrent()) $.ui.invalidate("ui.render");
        }),
      ],
    });
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
