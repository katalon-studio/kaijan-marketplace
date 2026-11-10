import { nativeReport, resultCaption } from "./report-model.mjs";
import { reportToolPrefix, reportServer } from "./report-config.mjs";

const paneId = "kaijan-report";
const reportTools = new Set([
  "loki_report_show",
  "loki_report_open",
  "loki_report_get",
]);
const isReportTool = (name) =>
  typeof name === "string" &&
  name.startsWith(reportToolPrefix) &&
  reportTools.has(name.slice(reportToolPrefix.length));

/** Display saved reports. The only additional read is the same reportId from
 * this plugin's connected Local server when Claude truncated its tool result. */
export function register(on) {
  let generation = 0;
  let active = true;
  let selected;
  let tab = "tests";
  const expanded = new Set();
  const cards = new Map();
  const grouped = new Set();
  const findCard = (call, id) => {
    const saved =
      cards.get(call.tool_use_id ?? id) ??
      [...cards.values()].find(
        (card) => card.report.id === call.input?.reportId,
      );
    if (saved) return saved;
    const report = nativeReport(call.output);
    return report ? { output: call.output, report } : undefined;
  };

  on("session.start", async ($, e, next) => {
    active = true;
    generation++;
    selected = undefined;
    cards.clear();
    grouped.clear();
    expanded.clear();
    return next(e);
  });
  on("session.end", async ($, e, next) => {
    active = false;
    generation++;
    selected = undefined;
    cards.clear();
    grouped.clear();
    expanded.clear();
    await $.ui.close({ id: paneId });
    return next(e);
  });
  on(
    "tool.call",
    {
      tool: /^mcp__plugin_kaijan(?:-qa|-local)?_kaijan_local__loki_report_(?:show|open|get)$/,
    },
    async ($, e, next) => {
      const current = generation;
      const answer = await next(e);
      if (
        !e.agentId &&
        isReportTool(e.tool) &&
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
  function reportCard(elements, card, id, onPress) {
    const { Box, Text, Button } = elements;
    return Box({
      flexDirection: "column",
      borderStyle: "round",
      padding: 1,
      children: [
        Text({ bold: true, children: [card.report.title] }),
        Text({ children: [card.report.summary] }),
        Button({
          key: "kaijan-details-" + id,
          label: "Show details",
          onPress,
        }),
      ],
    });
  }
  on("ui.render", { component: "ToolGroup" }, async ($, e, next) => {
    if (!active) return next(e);
    const matches = [];
    for (const call of e.props.calls) {
      if (!isReportTool(call.tool) || call.isErrored || call.isRunning)
        continue;
      const card = findCard(call, call.tool_use_id);
      if (card) {
        const id = call.tool_use_id ?? `${e.requestId}-${card.report.id}`;
        grouped.add(id);
        matches.push({ card, id });
      }
    }
    const original = await next(e);
    if (!matches.length) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [
        original,
        ...matches.map(({ card, id }) =>
          reportCard($.ui.resolve(e), card, id, async () => {
            selected = card;
            tab = "tests";
            expanded.clear();
            await $.ui.open({
              id: paneId,
              title: "Kaijan report",
              focus: true,
              closeOnEscape: true,
            });
            $.ui.invalidate("ui.render");
          }),
        ),
      ],
    });
  });
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    if (!active) return next(e);
    const original = await next(e);
    if (
      grouped.has(e.requestId) ||
      !isReportTool(e.props.tool) ||
      e.props.isErrored ||
      e.props.isRunning
    )
      return original;
    const card = findCard(e.props, e.requestId);
    if (!card) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "column",
      children: [
        original,
        reportCard($.ui.resolve(e), card, e.requestId, async () => {
          selected = card;
          tab = "tests";
          expanded.clear();
          await $.ui.open({
            id: paneId,
            title: "Kaijan report",
            focus: true,
            closeOnEscape: true,
          });
          $.ui.invalidate("ui.render");
        }),
      ],
    });
  });
  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== paneId || !selected) return next(e);
    const { Box, Text, Button, Select } = $.ui.resolve(e);
    const report = selected.report;
    const redraw = () => $.ui.invalidate("ui.render");
    const line = (value, props = {}) => Text({ ...props, children: [value] });
    const detail = (item, key) => {
      const open = expanded.has(key);
      return Box({
        flexDirection: "column",
        children: [
          Button({
            key,
            label: `${open ? "▾" : "▸"} ${item.title} · ${resultCaption(item.status, item.expectationAuthority)}`,
            plain: true,
            onPress: () => {
              open ? expanded.delete(key) : expanded.add(key);
              redraw();
            },
          }),
          ...(open
            ? [
                line(item.title, { bold: true }),
                ...(item.expected
                  ? [
                      line(
                        `${item.expectationAuthority === "hypothesis" ? "Proposed expectation" : "Expected"}: ${item.expected}`,
                      ),
                    ]
                  : []),
                ...(item.steps?.length
                  ? [line("Planned steps", { bold: true })]
                  : []),
                ...(item.steps ?? []).map((step, index) =>
                  line(`${index + 1}. ${step}`),
                ),
                ...item.results.flatMap((result) => [
                  ...(result.expectedText && !item.expected
                    ? [line(`${result.expectedLabel}: ${result.expectedText}`)]
                    : []),
                  ...(result.observed
                    ? [line(`Observed: ${result.observed}`)]
                    : []),
                  ...(result.explanation
                    ? [line(`Could not check: ${result.explanation}`)]
                    : []),
                  ...result.steps.map((step) => line(step)),
                  ...result.actions.map((action) => line(action.text)),
                  ...result.evidence
                    .filter(
                      (quote) =>
                        quote.observation &&
                        ![
                          result.observed,
                          result.explanation,
                          ...result.steps,
                        ].includes(quote.text),
                    )
                    .map((quote) =>
                      line(`${quote.attribution}: ${quote.text}`),
                    ),
                ]),
              ]
            : []),
        ],
      });
    };
    return Box({
      flexDirection: "column",
      padding: 1,
      children: [
        Button({
          key: "kaijan-back",
          label: "‹ Back to chat",
          plain: true,
          onPress: () => $.ui.close({ id: paneId }),
        }),
        line(report.title, { bold: true }),
        Box({
          flexDirection: "row",
          columnGap: 2,
          children: [
            Button({
              key: "kaijan-tests",
              label: `Tests ${report.tests.length}`,
              plain: true,
              dimColor: tab !== "tests",
              onPress: () => {
                tab = "tests";
                redraw();
              },
            }),
            Button({
              key: "kaijan-runs",
              label: `Runs ${report.runs.length}`,
              plain: true,
              dimColor: tab !== "runs",
              onPress: () => {
                tab = "runs";
                redraw();
              },
            }),
          ],
        }),
        line(report.summary, { bold: true }),
        ...report.notices.map((notice) => line(notice)),
        ...(tab === "tests"
          ? [
              ...(report.plans.length > 1
                ? [
                    Select({
                      key: "kaijan-plan",
                      label: "Test plan",
                      value: report.selectedPlanId,
                      options: report.plans.map((plan, index) => ({
                        value: plan.id,
                        label: `Test plan ${index + 1}`,
                      })),
                      onSelect: (id) => {
                        selected.report = nativeReport(selected.output, id);
                        expanded.clear();
                        redraw();
                      },
                    }),
                  ]
                : []),
              ...(report.tests.length
                ? [
                    line(`All tests ${report.tests.length}`),
                    ...["Functional", "Change impact"].flatMap((group) => {
                      const items = report.tests.filter(
                        (test) => test.group === group,
                      );
                      return items.length
                        ? [
                            line(group, { bold: true }),
                            ...items.map((item) =>
                              detail(item, `test-${item.id}`),
                            ),
                          ]
                        : [];
                    }),
                  ]
                : [
                    line(
                      "No test plan selected. See Runs for recorded outcomes.",
                    ),
                  ]),
            ]
          : report.runs.length
            ? report.runs.map((run, index) =>
                Box({
                  flexDirection: "column",
                  children: [
                    line(`Run ${index + 1} · ${run.caption}`, { bold: true }),
                    line(
                      [
                        run.recordedAt,
                        run.elapsedMs === null
                          ? ""
                          : `${Math.round(run.elapsedMs / 1000)}s`,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    ),
                    ...(run.notice ? [line(run.notice)] : []),
                    ...run.tests.map((item) =>
                      detail(item, `run-${run.id}-${item.id}`),
                    ),
                  ],
                }),
              )
            : [line("No runs recorded.")]),
      ],
    });
  });
}
