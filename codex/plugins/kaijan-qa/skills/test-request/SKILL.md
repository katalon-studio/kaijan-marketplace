---
name: test-request
description: Carry a Kaijan testing request through planning, execution, evidence assessment, authorized fixes and retests, and report. Use when asked to review a change and reproduce findings in the app, validate behavior, or test and report. Preserve independent single-capability use.
---

# Carry the caller's request to its report

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

The caller chooses the business goal and scope. Compose the installed capabilities
to finish that request; do not choose another application, repository, PR or task.
One request can authorize Plan → Run → Assessment → Report. It does not need a
new instruction or phase approval for each internal call. A planning result itself
never grants execution authority. A plan-only request ends after its plan/report.

For a request to review a change and reproduce findings, keep this skill as the
owning flow while using the risk skill. Convert the relevant questions into test
cases with `plan-tests` before Runner starts. Include normal functional behavior,
not only risks. The saved Plan supplies each test's steps and expected behavior;
the exact Plan reference links the Run, assessment and report. Do not substitute
a list of risk questions or a combined ad hoc scenario for that Plan. A request
only to review risks does not start this flow. A complete caller-supplied scenario
can still use `run-test` directly.

## Retain the actual request

Keep the original wording, requested outcome, selected application/repository and
revision/PR/task, target/environment, allowed actions and material constraints.
Reuse supplied conversation and selected application context; a title match or an
unrelated recent PR is not selection. Distinguish external GitHub IDs from Kaijan
Work Item UUIDs. Do not require Core login, a PR, GitHub access or a complete app
map for operations that do not need them.

Use [context-handoff](../context-handoff/SKILL.md) when retaining the request or
passing its context between stages. Preserve original content and attribution;
keep agent interpretation separate. If a chat-only request has no original source
URI, retain its complete original text with `loki_context_submit`. Its returned
`sourceUri` identifies that immutable retained record, not an external ticket or
independently verified origin. Use that actual URI for a planning source; never
invent a GitHub link, file, revision or source capture time. Reuse the original
source URI when one exists. Native inputs still follow each consumer's contract;
a stored context is not automatically compatible with every capability.

Ask a concise native host Question only for consequential missing or ambiguous
input that available authorized context cannot resolve, such as the execution
target, permitted writes or required parameters. Use the host's effective mode;
do not demand a permission-setting change. No answer authorizes no dependent
action; a late answer cannot restart a stopped Run. Continue independent requested
work. Do not replace the request with a mandatory menu or invented authority flags.
Within a clear scope, select relevant data and tests without asking the caller to
precompute capability answers or approve routine internal choices.

## Compose only useful stages

Inspect `loki_capabilities_list` for the responding runtime, scope and actual
requirements. Choose only stages useful for the requested outcome:

- Acquire original selected Issue/PR/body/revision/files through an authorized
  maintained public capture API or host read. Planning does not fetch its own
  links. Keep original text/revisions and acquisition limits. Use
  [find-related-work](../find-related-work/SKILL.md) when related context helps;
  findings inform this request and do not select a different execution target.
- Use [assess-change-risk](../assess-change-risk/SKILL.md) for relevant uncertainty.
  Work-item risk can use the issue/request; Change Risk needs actual frozen change
  input. Do not fabricate a diff or require code evidence for a requirements-only
  question. A source app map is optional: use
  [build-app-map](../build-app-map/SKILL.md) only for the explicitly selected source
  and [read-app-map](../read-app-map/SKILL.md) for bounded existing-map reads.
- Use [plan-tests](../plan-tests/SKILL.md) with the complete original work item or
  its supported attributed context packet. Keep the actual completed `answerId`,
  `resultSha256`, original test IDs and full structured tests. Findings and
  implementation are context, not new intent. Supplements preserve the original
  baseline. Show the actual plan through [review-report](../review-report/SKILL.md).
  Cover the work item's normal functional behavior and acceptance conditions
  even when no risk is found. Change-impact and risk scenarios add coverage;
  they do not replace or limit that baseline.
- If execution belongs to the original request and inputs suffice, continue via
  [run-test](../run-test/SKILL.md) without another user command. Choose the full
  executable scenarios within that scope; retain their prerequisites, steps,
  expectations/hypotheses, parameters and exact Plan reference/test IDs. Pass
  full scenarios, not just IDs. For a single planned test, keep its actual test ID
  as scenarioId and use `planRef: {answerId, resultSha256, selectedTestIds}`. A
  combined Run remains one execution; preserve its original outcome identity and
  do not invent per-test verdicts or rewrite the native assessmentFragment.
  Missing parameters/oracles block the dependent
  test, not unrelated selected tests. Disclose selected and unexecuted coverage.
- Read original Runner outcomes and evidence completely. A request to test or
  validate includes assessing the selected test cases after execution; do not
  wait for a second request. Follow
  [assess-test-evidence](../assess-test-evidence/SKILL.md).
  First save the original Plan and Run together with `loki_report_show`. Use that
  report and Run with `loki_assessment_prepare`; do not hand-copy a shortened
  Runner fragment into a new assessment. Supply the complete original selected
  tests, including their steps and expectations, with their Plan ID and digest.
  Each proposed-test record must keep its original test ID and put the full
  original test object in `text` as JSON. This lets preparation bind tests to
  the exact saved Plan and selected Run, including a shared scenario.
  Carry relevant source findings and already collected app/revision, startup and
  cleanup records in attributed `receipts`. Include inspected screenshot
  observations in `suppliedObservations`, with exact artifact references and the
  inspecting agent's attribution. Use the report artifact reader to select the
  relevant original records. Select the original PNGs so the assessor can inspect
  their pixels; an unresolved reference alone supplies no image. Missing evidence
  stays missing; no new execution
  is needed to prepare the retained evidence. Submit the prepared assessment input
  unchanged. Keep inferred test expectations separate from human requirements.
  Preserve original outcome/evidence IDs, labels and Plan/Run/result digests.
  Keep the native verdict unchanged. The separate assessor may return pass,
  fail or inconclusive for each selected test. Report that assessment with its
  evidence and identity; it is not the Runner's own verdict. An unfinished test
  can still have a failed expectation when observed evidence contradicts it;
  missing evidence alone is inconclusive.
- Show the final selected Plan, Runner and Assessment references through
  `loki_report_show` with `view: "test-plan"` for the existing native inline card
  and details design. Keep every selected original operation in the immutable
  snapshot. Product terminal checks, native engine output, Assessment and UI
  projection remain distinct. Missing source, Quality, coverage, step verdicts or
  replay stays unavailable; do not generate finished report data or test code.

No stage needs a new workflow service, Core entity or background watcher. Narrow
requests continue using their independent owning skills and existing public APIs.

## Continue after an observed failed expectation

After assessment, use the observed expected/actual behavior and evidence to
diagnose the failure in the selected application and revision. A failed test is
not automatically a filed bug. An inconclusive result, missing evidence or
provider failure does not establish an application defect.

When the caller's request and effective host permissions authorize repairs,
Codex fixes the application within that scope, then Kaijan retests through
[run-test](../run-test/SKILL.md) and reassesses the new evidence through
[assess-test-evidence](../assess-test-evidence/SKILL.md). Continue without a new
phase approval while that authority still applies. In read-only scope, show the
findings and ask before repairs. Do not edit under explicit no-edit or plan-only
instructions. Continue the fix/retest loop only when the caller changes that
scope and the host permits it.
Keep Stop and unresolved effects as stopping conditions; do not repair or rerun
to escape an uncertain operation. State any remaining blocker or failure.

Retest the failed scenarios and relevant behavior touched by the fix. Keep the
original Plan, test IDs, steps and expectations; do not weaken an expectation to
obtain a pass. If the fix needs added coverage, retain it as a supplement. Record
the actual application revision and target for each run. Keep the first failure,
its evidence and assessment unchanged. Each retest uses a new Run identity;
recovery of an uncertain Run uses its original identity and input.

Save the final report with the original Plan and all selected original and retest
Runner/Assessment references, including their actual IDs and digests. Retain
earlier immutable reportIds so each run's snapshot can still be opened. State
what failed before the fix, what changed and what the retest established. A later
pass does not replace earlier failures or prove unexecuted coverage.

## Keep progress and recovery tied to originals

Retain the request/context and exact producer references as each stage completes.
On a lost Runner reply, recover its same requestKey/input and get the original
operation. Never replay uncertain effects or run again just to fill a report.
Whole-Run Stop uses the original Runner Stop/get; advisory cancellation uses the
in-flight host request. Stop is not permission to advance to another execution.
Assessment of retained partial evidence is separate from resuming test actions.

Reopen with the exact saved reportId: no new Plan, Runner, Assessment or prompt.
Show details reads that snapshot and requests native Codex panel expansion. Keep
host theme and controls; do not open a browser fallback for the installed panel.
Return the actual completed/partial outcome and the precise missing evidence.
