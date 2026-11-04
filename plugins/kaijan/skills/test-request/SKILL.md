---
name: test-request
description: Carry a Kaijan testing request through planning, execution, evidence assessment, authorized fixes and retests, and report. Use when asked to review work-item or change risks and prepare tests, review a change and reproduce findings in the app, validate behavior, or test and report. Preserve independent single-capability use.
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

## Review requirements and risks before planning

A request to review risks and prepare tests selects both stages, even when the
caller does not ask to run the application. Read the original work item and
relevant linked requirements first. Follow links that define the selected task's
scope, dependencies or acceptance conditions. Preserve their original text and
source identities. Use authorized source reads and report specific access gaps;
do not treat an unread link as reviewed context.

Use `assess-change-risk` for the requested review. A work item without code uses
work-item risk mode. Pass its exact saved answer through `riskAnswers` to
`plan-tests`, together with the original work item and attributed linked sources.
Check that the returned plan covers the original requirements and requested
review. Show the saved report before reporting those stages as complete.
A plan alone does not complete a request for a risk review and tests. Keep any
manual suggestions separate from saved Kaijan results. If a stage fails, retain
that result and explain which requested work remains.

For a request only to propose tests, use `plan-tests` directly. Additional risk
analysis remains optional unless the caller requested it or a material question
makes it useful. Neither request authorizes application execution by itself.

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

When the user asks for linked design or task details, read the relevant authorized
sources before the first Plan. If a later source changes a saved expectation,
follow the revision steps in `plan-tests` and open the revised report before
presenting its tests.

Ask a concise native host Question only for consequential missing or ambiguous
input that available authorized context cannot resolve, such as the execution
target, permitted writes or required parameters. Use the host's effective mode;
do not demand a permission-setting change. No answer authorizes no dependent
action; a late answer cannot restart a stopped Run. Continue independent requested
work. Do not replace the request with a mandatory menu or invented authority flags.
Within a clear scope, select relevant data and tests without asking the caller to
precompute capability answers or approve routine internal choices.

## Compose only useful stages

For an authorized local checkout and test server, collect host evidence before
Runner starts. Record the selected source path, HEAD and actual working-tree
changes with content digests when dirty; HEAD alone does not identify that source.
Keep the startup command, actual output and capture times. Record the process
serving the target listener and its configured source root, including root overrides.
Compare the selected source with existing served build metadata or an observed
served module when available. A reachable URL or process working directory alone
does not prove which source the server serves. Keep each gap explicit.

Include these host observations in the structured scenario context, with their
attribution and capture time. Keep startup, source checks and the source/runtime
comparison distinct from the requested behavior. Kaijan retains them with the
run, so do not resend them after execution. Keep the original test prerequisites and expected behavior. Give
browser Runner the relevant host findings as context for UI behavior; do not ask
it to verify Git or filesystem facts. Repeat relevant host checks after a source
or server change before a retest, and keep each Run's records separate.

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
  question. Use the original request and attributed source/context evidence. This release does not build or require an application map.
- Use [plan-tests](../plan-tests/SKILL.md) with the complete original work item or
  its supported attributed context packet. Keep the actual completed `answerId`,
  `resultSha256`, original test IDs and full structured tests. Findings and
  implementation are context, not new intent. Supplements preserve the original
  baseline. Show the actual plan through [review-report](../review-report/SKILL.md).
  Cover the work item's normal functional behavior and acceptance conditions
  even when no risk is found. Change-impact and risk scenarios add coverage;
  they do not replace or limit that baseline.
- If execution belongs to the original request and inputs suffice, continue via
  [run-test](../run-test/SKILL.md) without another user command. Select the saved
  tests within that scope. Use `savedTests: {answerId, resultSha256, selectedTestIds}`
  with explicit parameters and target. Kaijan loads the complete selected tests
  internally, including prerequisites, steps, expectations and gaps. Supply new
  guidance or host observations separately; do not copy the saved tests into chat.
  For a single planned test, keep its actual test ID as `scenarioId`. A
  combined Run remains one execution; preserve its original outcome identity and
  do not invent per-test verdicts or rewrite the native assessmentFragment.
  Missing parameters/oracles block the dependent
  test, not unrelated selected tests. Disclose selected and unexecuted coverage.
- The normal `loki_test_execute` flow runs the selected scenario, assesses its
  saved evidence and saves the combined report. Use `loki_test_get` until that
  flow settles. Kaijan reads its own original request, exact selected Plan tests
  and retained artifacts. Do not create an intermediate report, JSON-copy tests,
  select screenshot files or manually invoke the routine assessment.
- Read the separate execution and assessment results. Completion is not a pass.
  A partial run can still provide evidence of a failed expectation. Missing
  evidence alone is not an app defect. If new caller context can resolve a
  specific gap, use the independent evidence-assessment capability with that
  addition; do not rerun browser actions to reconstruct saved evidence.
- Show the returned combined `report.reportId` through
  [review-report](../review-report/SKILL.md), within the existing Tests and Runs
  design. Keep the original Plan, Run and Assessment identities. Do not invent
  performed steps or a verdict.

For tests run outside Kaijan, use
[assess-test-evidence](../assess-test-evidence/SKILL.md) with the external results.
Narrow requests continue to use their independent owning skills. No Core entity
or background watcher is needed for this composition.

## Continue after an observed failed expectation

After assessment, use the observed expected/actual behavior and evidence to
diagnose the failure in the selected application and revision. A failed test is
not automatically a filed bug. An inconclusive result, missing evidence or
provider failure does not establish an application defect.

When the caller's request and effective host permissions authorize repairs,
Codex fixes the application within that scope, then Kaijan retests through
[run-test](../run-test/SKILL.md), which assesses the new evidence and saves its
report. Use separate evidence assessment only for execution outside Kaijan or
additional supplied evidence. Continue without a new
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
