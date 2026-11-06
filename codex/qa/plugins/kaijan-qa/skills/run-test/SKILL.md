---
name: run-test
description: Run and assess a complete caller-authorized browser or macOS desktop scenario, read its result, or Stop the same test. Standalone execution remains available when explicitly needed. Use only with explicit target/action authority; not for proposing tests or non-UI verification.
---

# Execute an explicit UI scenario

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

For final user wording, follow [Present assessed results](../../references/assessed-result-language.md). Preserve native verdicts in records; do not repeat an internal `unverified` label as a customer warning after a valid linked assessment.

When execution follows a request to review a change and reproduce its findings,
use [test-request](../test-request/SKILL.md) to retain the Plan and selected tests
before dispatch. For a standalone full scenario supplied by the caller, continue
directly here. Do not create a retrospective Plan to fill an earlier run's report.

Runner uses the plugin's Local MCP tools. If those tools are missing from the
current chat, follow the installed `setup` skill's connection guidance.
Kaijan sign-in and target-application login are separate checks. Read a saved
result or Stop an existing test when its Local tool is available, even if AI
access is missing.

1. Before starting a new test, follow [AI access and sign-in recovery](../setup/references/provider-setup.md)
   for the installed package. Managed Runner and assessment need the Kaijan
   grant. Check `loki_connection_status` for the intended account, workspace and
   `ai:invoke` permission. If access is missing, expired or revoked, use the
   installed `kaijan_connect` when available. Let the user complete sign-in and
   consent, then recheck access before dispatch. A confirmed direct-development
   build uses its own provider settings.
   Check `loki_capabilities_list` for `testExecution` and `evidenceReview` readiness.
   Each action reports `available`, `setup-required` or `unavailable` with a
   recovery message. Follow that message and the installed Setup guidance.
   Discovery is passive: `available` does not prove application access or a
   successful test. Its `validation` field says this request did not check those.
   Use `connection.state` and `connection.message` for connection recovery. If
   reconnection is required, follow the installed Setup recovery and check again.
   Missing browser/target/permission checks remain explicit. Use supported private
   configuration repair; never ask for secrets in chat. After a host environment
   change, reconcile admitted work before reconnecting, then continue the same goal.
   After restart, read the original operation to check whether saved work is
   available in this chat; readiness alone does not prove recovery. Never
   redispatch uncertain work. Resolve the
   authorized browser URL or app bundle ID, actions and actual friendly parameter values. Planning
   grants no execution permission. The original full test request can already
   authorize execution; do not ask for a separate phase approval when its target,
   actions and inputs are clear. A plan-only request never starts this skill.
   Browser session attachment and memory are unsupported. For approved browser
   login values, use [Private login parameters](../../references/private-parameters.md).
   Pass its `privateParams` references. Do not read or print values in chat,
   command output or MCP arguments. Desktop execution preserves the target app’s
   current state. Do not inspect unrelated profiles or histories.
   For browser sign-in, include the application host and its known sign-in hosts
   in `target.allowedHosts`. Use the supplied application context or an observed
   sign-in redirect; do not guess broad host lists or use wildcards. A normal
   sign-in service is part of an authorized application login. If navigation is
   blocked, read the retained blocked host and completed actions. When the record
   confirms that login did not start, add the verified sign-in host and continue
   the same authorized task in a new run. Do not repeat a submitted login or
   unknown action to discover whether it succeeded.
2. Normally call `loki_test_execute` with one stable `requestKey`, exact `scenarioId`,
   explicit `params` ({} when empty), and the method-specific target.
   For Kaijan's saved Plan, use `savedTests: {answerId, resultSha256, selectedTestIds}`.
   Kaijan loads each complete structured test and gives Runner the full scenario.
   Add new `guidance` and `hostContext` when useful. Do not combine `savedTests`
   with `scenario` or `planRef`; the tool rejects missing, changed or out-of-scope
   saved tests before dispatch.
   For a caller-supplied scenario, pass the full `scenario` and optional `planRef`.
   Standalone Runner also requires the full scenario; its IDs correlate only.
   Include known routes, setup, fixture names, labels and navigation guidance.
   Keep that context separate from the original expected behavior; it must not
   redefine success. Declare unresolvedInputs rather than dispatch missing values.
   Use browser-ui with target.initialURL or desktop-ui with target.app; other methods return
   not-executed. See the [Runner contract](../../references/RUNNER.md).
   For headless browser execution, set `options.headless: true` on this MCP
   request. Omission keeps the headed default. This option is browser-only.
   Omit `options.limits` unless the caller needs a shorter time limit or a
   smaller action limit. Use only the fields and bounds in the selected tool's
   input schema. Keep the same run if a limit prevents completion.
   Use MCP so the run keeps its full report and retained request identity.
   Keep the full original request in Codex, including cleanup duties. Include
   all requested app and browser actions in the scenario. Use separate guidance
   to identify who owns host cleanup. Keep host duties out of the scenario's
   steps and expected results. Runner attempts to close its run-owned browser
   after its execution decision and records cleanup separately. Codex owns
   stopping a local test server it started and revoking a temporary private
   login binding. Binding revocation is a separate host action.
   Include app sign-out only when the user explicitly requests it. Keep all
   other requested in-app cleanup in the scenario.
   Keep requested behavior, caller-authored hypotheses and observation-only questions
   distinct. “Observe what remains after reload” asks for an observation; it does
   not require persistence. Compare persistence only when the caller explicitly
   requires it. Do not strengthen an observation question or prescribe an additional
   action mechanism as an acceptance requirement.
3. Read `loki_test_get` until the complete flow settles, including assessment.
   Check `nextAction` before polling again. `kind: input-required` and
   `status.execution: waiting-for-input` mean Runner is waiting for your answer,
   not doing browser work. Read its questions now. Use known authorized context
   or ask the human for the missing information. Do not keep polling in place of
   handling the question. If no answer can arrive within the stated deadline,
   stop the same test and retain its partial results. Do not guess or restart.
   Standalone `loki_runner_get` exposes the same `nextAction`.
   The `execution` field holds the original Runner result. For browser clarification,
   `execution.pendingClarification` is null or has `state: live | unknown` and questions
   with `id`, `kind` and `question`. Only `live` has current callback authority;
   `unknown` is an unresolved retained request that cannot resume. For a live
   request, call `loki_runner_answer({runId, clarificationId, answerKey, answers, sensitiveQuestionIds})`
   with exact question IDs and nonempty string answers. Supply known steps,
   preconditions, fixtures, expected results or params within original authority.
   Answer from known authorized context or a focused read of the selected app
   docs/source when possible. Ask the human only for missing information or a
   decision Codex cannot resolve. Do not guess. Keep the same live Run; a question
   is not a reason to restart it.
   Use the default result summary for verdicts, actual observations, performed
   steps and the report. Keep cost accounting, model settings and provider
   receipt details in internal records. Customer diagnostic requests do not
   authorize disclosure of proprietary Kaijan engine details. Follow the shared
   confidentiality rule for all customer output. Read
   `originalResult` with ordered offsets only when the task needs full evidence
   records. It never runs the test again.
   Mark new sensitive full answer values with `sensitiveQuestionIds`, a unique
   list of exact answered IDs. Omission adds no sensitivities; ordinary answers
   remain ordinary. Declaration metadata/order participates in exact-key conflicts.
   Raw originals stay private; unavailable protection inputs or unsafe model IDs
   withhold public content, without changing IDs or granting resume authority.
   An answer key and parsed JSON bytes identify an immutable private receipt;
   an identical retry reads it without redelivery, including after Stop or restart.
   Conflicting, stale or wrong-scope calls cannot dispatch. Receipt status
   `retained` proves retention only; Stop, deadline or IPC loss can prevent delivery.
   Check the correlated native function output and subsequent result for continuation.
   The original request is immutable; any live continuation uses the same worker,
   browser and provider history, and waiting consumes the original deadline.
   For standalone Runner, follow ordered resultRead chunks when needed. Preserve nativeResult,
   including executionState, unverified testVerdict, terminal reason, fees, unknown
   usage and cleanup. Browser executionState is `completed` only for a coherent
   explicit complete report with known effects and no remaining steps/questions;
   otherwise it is `incomplete`. Stop/deadline/failure before the terminal decision
   dominate; accepted disposition is frozen before cleanup. Cleanup deadline/Stop
   observations stay separate and do not reverse accepted completion. Cause is in
   `terminal.actor`/`terminal.reason`. Wrapper `finished` only retains a result.
   Final prose or capture alone is insufficient. Model-authored completion and step
   reports are execution evidence; the internal assessment checks the observations
   against the test. Do not run a second browser check merely to duplicate it. Raw traces, provider requests and browser state remain
   private references.
   Report the requested behavior, attempted action, actual observation and unresolved
   selection separately. Observation-only completion records what was observed;
   disappearance alone is not an accepted defect or evidence of its cause. A theme
   or layout click, changed icon or changed arrangement does not prove the requested
   state was selected. If state evidence is insufficient, say which selection is
   unproved. Unavailable application state is not missing human instructions; do not
   ask the human to restate an already clear request. A truly missing input, such as
   an exact label, still uses the live clarification path above. Preserve original
   answers, uncertainty and the native unverified label.
4. Use a fresh UUID for a new execution. A lost reply reuses the same key and full input.
   On request_key_conflict the rejected call did not dispatch. Inspect the
   existingRunId when resuming; use the suggested fresh key only for a separate
   authorized execution. Reconnect/get never execute.
   On `not-executed` with reason `runner_worker_launch_failed`, no worker started
   and no provider call or browser action occurred. Keep the failed run receipt.
   Reconnect the installed plugin (use a fresh chat if necessary), confirm the
   responding runtime, then use a new key for the still-authorized test. Do not
   retry through the stale connection. This recovery does not apply to unknown
   effects or a worker that started and then lost its result.
   Never replace or replay unknown effects. Honor Stop with `loki_test_stop`,
   then read actual cancellation, partial evidence and cleanup. Stop requested
   does not prove that all work or cleanup ended.
   A temporary connection failure may recover within the same operation. Keep
   its original result and uncertainty; do not restart the run or repeat browser
   actions to recover a failed response. Use the returned reason, completed steps,
   remaining steps and any live question to decide what to do next. A blocked
   result ends incomplete. Errors, uncertain effects, task restrictions, Stop
   and deadlines never authorize replay or broader access. Desktop does not
   support the browser clarification behavior.
5. Kaijan assesses the retained run internally. It reuses the original scenario,
   parameters, linked Plan and captured evidence. Do not copy the test objects,
   select screenshots or submit a second routine assessment. Keep `execution`
   and `assessment` distinct and use the returned report. A failed assessment
   does not show a defect in the tested app and never calls for a browser replay.
   Codex may supply useful new context when a specific gap needs it.
6. Complete the caller-owned cleanup in the original request. Stop only servers
   or other test processes this task started, using their retained handles or
   recorded PIDs, and verify they ended. Revoke a temporary private login
   binding with the [private parameters command](../../references/private-parameters.md)
   when no further authorized run needs it. Read Runner's recorded browser cleanup;
   an execution completion alone does not prove cleanup. Keep failed or unknown
   cleanup explicit and separate from app-check results. Preserve the original
   Runner status and report; later host cleanup does not rewrite an incomplete
   run or turn it into a pass. Do not stop a shared or unrelated process.

For an explicit execution-only task, use `loki_runner_execute`, `loki_runner_get`
and `loki_runner_stop`. For tests run by Codex or another tool outside Kaijan,
use [assess-test-evidence](../../references/capability-skills/assess-test-evidence/SKILL.md). These independent
paths do not replace the normal combined test flow.

To inspect an existing browser recording, follow
[View a saved browser trace](../review-report/SKILL.md#view-a-saved-browser-trace).
Use the saved report/run and the supported local viewer, including for sign-in
runs. Do not start another test or use the artifact reader as a trace viewer.
Browser trace content and provider HTTP/request records are separate. Each execution has an
isolated Node API worker; worker loss/host disconnect preserves partial evidence
and never licenses replay. Inspect executionHost and the private worker receipt
when the IPC handoff is uncertain.

## Show the retained result

After reading the complete result, use the installed `review-report` skill
to open its saved `report.reportId`. For standalone execution, use its exact
runner operation ID and result digest. Include other
plan/run/assessment references only when selected or explicitly linked. Keep the
producer output unchanged; the report is a read-only projection, not another
execution or an acceptance decision. Missing host UI does not justify a rerun.

## macOS desktop scenarios

For an authorized desktop scenario, use the same Runner tools with
`executionMethod: "desktop-ui"` and `target.app` set to the application's bundle ID.
Set `target.launch: true` when launch is allowed, or `false` to require it already
running. Send the full scenario and explicit parameters; do not translate them
into navigation instructions. Use `desktopInputs` for the input limit. The host
needs full configured Xcode, UI Automation/Accessibility permission and an unlocked
GUI. Keep the app on the main display. Appium/Mac2 are packaged; do not install
Peekaboo or use a browser initialURL for a desktop request.

Stop/get operate on the same returned run ID. App state stays open after the run.
Read native screenshot/action/log artifacts only within the task's existing
authority; reading them does not authorize disclosure of engine details.
Playwright's viewer applies only to browser traces. Report observed app actions
and results, not internal calls or input counts. Keep cost estimates in internal
receipts. A model completion is not a verified test pass.

## Authored terminal checks

For caller-authorized Expected/Actual checks, add `checks` using
`loki.terminal-checks/1` to the ordinary `loki_test_execute` request (or explicit execution-only request). Author the
test titles, IDs and text/snapshot/URL predicates before dispatch. Use the exact
stored Plan answer/digest and selectedTestIds; selected tests and authored checks
must match. For a selected PR, first retain its original authorized GitHub PR/files
reads through `nativeInputs.reportSources`, then pass that `sourceContextId` and
the actual PR head or merged revision. See the [terminal-check/source contract](../../references/RUNNER.md#terminal-checks-and-pr-sources).

The receiver evaluates contains, not-contains or equals against the original
terminal observation and persists Product `verification` with Expected/Actual,
steps and evidence hashes. It accepts no caller-supplied verdict. Edit checks by
using a new requestKey for a new execution; keep deliberate failing controls
explicit. Missing observations, incomplete execution or Stop before the terminal
decision cannot pass checks.
Terminal checks do not prove prior actions, viewport visibility or persistence.
Preserve Runner's native unverified label and the separate model Assessment.
Select original Plan/Runner references and sourceContextId in `review-report`;
never prepare or inject a finished pass/fail report to imitate this user flow.
