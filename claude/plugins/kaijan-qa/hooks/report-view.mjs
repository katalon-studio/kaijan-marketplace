// Native presentation of the validated saved report. No model, storage or tool
// calls belong here; navigation only changes this report's local view state.
export function reportCard(elements, card, id, onPress, forms, detailUrl) {
  const { Box, Text, Button } = elements;
  const report = card.report;
  return Box({
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "promptBorder",
    padding: "md",
    gap: "sm",
    children: [
      Box({
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        children: [
          Text({
            color: "claude",
            weight: "semibold",
            children: ["Kaijan"],
          }),
          Box({
            flexDirection: "row",
            alignItems: "center",
            gap: "sm",
            children: [
              ...(detailUrl
                ? [
                    elements.Markdown({
                      text: `[Open Kaijan report](${detailUrl})`,
                    }),
                  ]
                : []),
              Button({
                key: "kaijan-details-" + id,
                label: detailUrl ? "Refresh link" : "Show details",
                variant: detailUrl ? "secondary" : "primary",
                onPress,
              }),
            ],
          }),
        ],
      }),
      ...(report.planCard
        ? [
            Text({
              size: "heading",
              children: report.planCard.heading
                ? [report.planCard.heading]
                : [
                    Text({
                      weight: "semibold",
                      children: [report.planCard.countLabel],
                    }),
                    report.planCard.goal,
                  ],
            }),
            ...[report.planCard.functional, report.planCard.notice]
              .filter(Boolean)
              .map((line) =>
                Text({
                  color: "inactive",
                  size: "footnote",
                  children: [line],
                }),
              ),
          ]
        : report.runCard
          ? [
              Text({
                size: "heading",
                weight: "semibold",
                children: [
                  report.runCard.pullRequest
                    ? `PR #${report.runCard.pullRequest.number} · `
                    : "",
                  report.runCard.headline,
                ],
              }),
              Text({ children: [report.runCard.primary] }),
              ...(report.runCard.secondary
                ? [Text({ children: [report.runCard.secondary] })]
                : []),
              ...report.runCard.failedTitles.map((title) =>
                Text({ children: [`• ${title}`] }),
              ),
              ...(report.runCard.moreFailed > 0
                ? [
                    Text({
                      children: [
                        `${report.runCard.moreFailed} more failed ${report.runCard.moreFailed === 1 ? "test" : "tests"}`,
                      ],
                    }),
                  ]
                : []),
            ]
          : [
              Text({
                size: "heading",
                weight: "semibold",
                children: [report.title],
              }),
              Text({ weight: "semibold", children: [report.summary] }),
              Text({
                color: "inactive",
                size: "footnote",
                children: [reportCounts(report)],
              }),
            ]),
      ...forms,
    ],
  });
}

export function reportPane(elements, report, state) {
  const { Box, Text, Button, Select, Link } = elements;
  const { tab, expanded, caption, redraw } = state;
  const text = (value, props = {}) => Text({ ...props, children: [value] });
  const column = (children, props = {}) =>
    Box({ flexDirection: "column", gap: "md", ...props, children });
  const heading = (value) =>
    text(value, { size: "heading", weight: "semibold" });
  const card = (children) =>
    column(children, {
      borderStyle: "round",
      borderColor: "promptBorder",
      padding: "md",
      backgroundColor: "rgba(127,127,127,0.06)",
    });
  const section = (title, values) =>
    values.length
      ? [
          column([heading(title), ...values.map((value) => text(value))], {
            gap: "sm",
          }),
        ]
      : [];
  const toggle = (key) => {
    expanded.has(key) ? expanded.delete(key) : expanded.add(key);
    redraw();
  };
  const statusColor = (status) =>
    status === "pass" ? "success" : status === "fail" ? "error" : "inactive";
  const field = (title, value) =>
    value ? [text(title, { weight: "semibold" }), text(value)] : [];
  const detail = (item, key) => {
    const open = expanded.has(key);
    return column(
      [
        Button({
          key,
          label: `${open ? "▾" : "▸"} ${item.title} · ${caption(item.status)}`,
          plain: true,
          onPress: () => toggle(key),
        }),
        ...(open
          ? [
              card([
                heading(item.title),
                ...(!item.results.length
                  ? [
                      text(caption(item.status), {
                        color: statusColor(item.status),
                        weight: "semibold",
                      }),
                      ...field(
                        "Expected result",
                        item.expected || "Expected result unavailable.",
                      ),
                    ]
                  : []),
                ...item.results.flatMap((result) => [
                  text(caption(result.status), {
                    color: statusColor(result.status),
                    weight: "semibold",
                  }),
                  ...field(
                    "Actual result",
                    result.observed || "Actual result unavailable.",
                  ),
                  ...(result.explanation &&
                  result.explanation !== result.observed
                    ? [text(result.explanation)]
                    : []),
                  ...field(
                    "Expected result",
                    result.expectedText ||
                      item.expected ||
                      "Expected result unavailable.",
                  ),
                  ...section("Test evidence", [
                    ...result.steps,
                    ...result.actions.map((action) => action.text),
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
                      .map((quote) => `${quote.attribution}: ${quote.text}`),
                  ]),
                ]),
                ...section("Prerequisites", item.prerequisites ?? []),
                ...(item.steps?.length
                  ? [
                      heading("Planned steps"),
                      ...item.steps.map((step, i) => text(`${i + 1}. ${step}`)),
                    ]
                  : []),
              ]),
            ]
          : []),
      ],
      { gap: "sm" },
    );
  };
  const groups = ["Functional", "Change impact"].flatMap((group) => {
    const tests = report.tests.filter((test) => test.group === group);
    if (!tests.length) return [];
    const key = "group-" + group;
    const open = expanded.has(key);
    return [
      column(
        [
          Button({
            key,
            label: `${open ? "▾" : "▸"} ${group} · ${tests.length} ${tests.length === 1 ? "test" : "tests"}`,
            plain: true,
            onPress: () => toggle(key),
          }),
          ...(open ? tests.map((test) => detail(test, "test-" + test.id)) : []),
        ],
        { gap: "sm" },
      ),
    ];
  });
  const orderedRuns = report.runs
    .map((run, index) => ({ run, index }))
    .sort((a, b) => {
      const time = (run) => {
        const value = Date.parse(run.recordedAt ?? "");
        return Number.isFinite(value) ? value : -Infinity;
      };
      const at = time(a.run);
      const bt = time(b.run);
      return at === bt ? a.index - b.index : bt - at;
    });
  const runs = orderedRuns.map(({ run, index }) =>
    card([
      heading(`Run ${index + 1} · ${run.caption}`),
      text(
        [
          run.recordedAt,
          run.elapsedMs === null ? "" : `${Math.round(run.elapsedMs / 1000)}s`,
        ]
          .filter(Boolean)
          .join(" · "),
        { color: "inactive", size: "footnote" },
      ),
      text(
        run.sourceRevision
          ? `Commit ${run.sourceRevision}`
          : "Commit not recorded",
        { color: "inactive", size: "footnote" },
      ),
      ...(run.notice ? [text(run.notice)] : []),
      ...(run.tests.length ? [heading("Tests")] : []),
      ...run.tests.map((item) => detail(item, `run-${run.id}-${item.id}`)),
      ...(run.recap.length
        ? [
            heading("Executed steps"),
            ...(run.recapDetailsOmitted
              ? [
                  text(
                    "Some private details are omitted from these saved steps.",
                    { color: "inactive" },
                  ),
                ]
              : []),
            ...run.recap.map((step, i) => text(`${i + 1}. ${step}`)),
          ]
        : section("Completed steps", run.completedSteps)),
      ...section("Not completed", run.remainingSteps),
      ...(!run.recap.length &&
      run.reason &&
      ![run.notice, ...run.completedSteps, ...run.remainingSteps].includes(
        run.reason,
      )
        ? section("Saved execution details", [run.reason])
        : []),
    ]),
  );
  const tabs = [
    ["tests", `Tests ${report.tests.length}`],
    ["runs", `Runs ${report.runs.length}`],
    ["related-work", "Related work"],
  ];
  if (report.applicationModel) tabs.push(["app-model", "App model"]);
  const relatedWork = report.relatedWork.length
    ? report.relatedWork.map((group, index) =>
        column([
          ...(report.relatedWork.length > 1
            ? [heading(group.title || `Test plan ${index + 1}`)]
            : []),
          ...group.notices.map((notice) => text(notice)),
          ...group.sources.map((source) =>
            column(
              [
                source.url
                  ? text(Link({ href: source.url, label: source.title }))
                  : text(source.title),
                text(`${source.kind} · ${source.relation}`, {
                  color: "inactive",
                }),
              ],
              { gap: "sm" },
            ),
          ),
        ]),
      )
    : [text("No saved Related work result for this report.")];
  const applicationModel = report.applicationModel;
  const views = applicationModel
    ? new Map(applicationModel.views.map((view) => [view.id, view]))
    : new Map();
  const appModel = [...views.values()].map((view) => {
    const key = `app-model-${view.id}`;
    const open = expanded.has(key);
    return column([
      Button({
        key,
        label: `${open ? "▾" : "▸"} ${view.name}`,
        plain: true,
        onPress: () => toggle(key),
      }),
      ...(open
        ? [
            ...[view.kind, view.purpose]
              .filter(Boolean)
              .map((value) => text(value)),
            ...section("Page controls", view.controls),
            ...section("Page fields", view.fields),
            ...section(
              "Leads to",
              applicationModel.transitions
                .filter((edge) => edge.from === view.id && views.has(edge.to))
                .map((edge) => `${edge.action} → ${views.get(edge.to).name}`),
            ),
          ]
        : []),
    ]);
  });
  return column(
    [
      Button({
        key: "kaijan-back",
        label: "‹ Back to chat",
        plain: true,
        onPress: state.onClose,
      }),
      text(report.title, { size: "title", weight: "bold" }),
      Box({
        flexDirection: "row",
        gap: "md",
        children: tabs.map(([name, label]) =>
          Box({
            flexDirection: "row",
            alignItems: "center",
            gap: "sm",
            paddingX: "sm",
            children: [
              text(tab === name ? "▏" : "\u00a0", { color: "claude" }),
              Button({
                key: "kaijan-" + name,
                label,
                plain: true,
                onPress: () => state.onTab(name),
              }),
            ],
          }),
        ),
      }),
      card([
        text(report.summary, { size: "heading", weight: "semibold" }),
        text(reportCounts(report, true), {
          color: "inactive",
          size: "footnote",
        }),
      ]),
      ...report.notices.map((notice) => text(notice)),
      ...(tab === "tests"
        ? [
            ...(report.plans.length > 1
              ? [
                  Select({
                    key: "kaijan-plan",
                    label: "Test plan",
                    value: report.selectedPlanId,
                    options: report.plans.map((plan, i) => ({
                      value: plan.id,
                      label: `Test plan ${i + 1}`,
                    })),
                    onSelect: state.onPlan,
                  }),
                ]
              : []),
            ...section("Review the plan", report.reviewNotes),
            ...section("Expectations to review", report.expectationNotes),
            ...(report.tests.length
              ? [
                  heading(`All tests ${report.tests.length}`),
                  Button({
                    key: "kaijan-expand",
                    label: report.tests.every((test) =>
                      expanded.has("test-" + test.id),
                    )
                      ? "Collapse all"
                      : "Expand all",
                    plain: true,
                    onPress: () => {
                      const collapse = report.tests.every((test) =>
                        expanded.has("test-" + test.id),
                      );
                      for (const test of report.tests) {
                        if (collapse) expanded.delete("test-" + test.id);
                        else {
                          expanded.add("group-" + test.group);
                          expanded.add("test-" + test.id);
                        }
                      }
                      redraw();
                    },
                  }),
                  ...groups,
                ]
              : [
                  text(
                    "No test plan selected. See Runs for recorded outcomes.",
                  ),
                ]),
          ]
        : tab === "related-work"
          ? relatedWork
          : tab === "app-model"
            ? appModel
            : runs.length
              ? runs
              : [
                  card([
                    heading("No test runs"),
                    text("This report contains no saved runs."),
                  ]),
                ]),
    ],
    { padding: "md", gap: "lg" },
  );
}

function reportCounts(report, grouped = false) {
  const count = (n, singular, plural = `${singular}s`) =>
    `${n} ${n === 1 ? singular : plural}`;
  return [
    ...(grouped
      ? [
          ["Functional", "functional test"],
          ["Change impact", "change impact test"],
        ].flatMap(([group, label]) => {
          const n = report.tests.filter((test) => test.group === group).length;
          return n ? [count(n, label)] : [];
        })
      : report.tests.length
        ? [count(report.tests.length, "test")]
        : []),
    count(report.runs.length, "run"),
  ].join(" · ");
}
