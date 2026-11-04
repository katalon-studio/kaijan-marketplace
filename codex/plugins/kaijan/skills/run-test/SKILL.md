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

Runner uses the plugin's Local MCP connection. Core cloud sign-in is not required.
If Runner tools are missing from the current chat, follow the installed `setup`
skill's connection guidance; do not ask the user to sign in to Core as a remedy.
Check actual Runner provisioning separately from target-application credentials.

1. Check `loki_capabilities_list` for computerRunner provisioning. Discovery is
   passive: `configured` means configuration is present, never validated execution.
   Inspect `configuration` for missing/invalid reasons, `provider.validation` for
   unknown validity, and `runtime` for the responding artifact, connection and scope.
   A managed broker binding does not prove upstream credentials or model access.
   Missing browser/target/permission checks remain explicit. Use supported private
   configuration repair; never ask for secrets in chat. After a host environment
   change, reconcile admitted work before reconnecting, then continue the same goal.
   Compare the responding identity to the exact selected artifact; matching on-disk
   metadata alone leaves freshness unknown. Connection-only scope cannot recover
   after restart; preserve that limitation and never redispatch uncertain work. Resolve the
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
   Omit `options.limits` to use the native budget: 80 provider calls, 150
   browser or desktop inputs, and 600000 ms (10 minutes). Set limits only
   to lower that budget; larger values are rejected before execution.
   Use MCP so the run keeps its full report and retained request identity.
   Keep the full original request, including cleanup duties. In separate guidance,
   distinguish app/browser actions from host process work. Runner attempts to
   close its run-owned browser after its execution decision and records cleanup
   separately. Codex owns shutdown of a local test server it started. Do not ask
   browser tools to stop that server or verify host processes. Keep requested
   in-app cleanup in the scenario; do not remove expected behavior to obtain a pass.
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
   steps, costs and the report. Read `originalResult` with ordered offsets only
   when the task needs full evidence records. It never runs the test again.
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
   does not prove remote computation or billing ended.
   Browser provider transient HTTP responses retry quietly within the same request
   (three attempts, 1s/2s backoff, Retry-After capped at 30s). Stop/deadline interrupt
   waits and body reads. Keep every attempt's original usage/unknown charges;
   never restart the run or repeat browser actions to recover a provider failure.
   Uncertain transport, incomplete bodies and invalid/auth errors do not retry.
   For browser execution, the first known-effects `stuck` raises Terra effort from low to
   medium for one recovery phase within original limits;
   a second returns reason and completed/remaining steps. A `blocked` report ends
   incomplete without escalation and keeps the reason and remaining checks. Missing input does not
   consume escalation. Errors, uncertain effects, safety, Stop, deadline and exhausted
   limits never auto-recover or replay. Desktop does not support the clarification
   or recovery behavior.
5. Kaijan assesses the retained run internally. It reuses the original scenario,
   parameters, linked Plan and captured evidence. Do not copy the test objects,
   select screenshots or submit a second routine assessment. Keep `execution`
   and `assessment` distinct and use the returned report. A failed assessment
   does not show a defect in the tested app and never calls for a browser replay.
   Codex may supply useful new context when a specific gap needs it.
6. Complete the caller-owned cleanup in the original request. Stop only servers
   or other test processes this task started, using their retained handles or
   recorded PIDs, and verify they ended. Read Runner's recorded browser cleanup;
   an execution completion alone does not prove cleanup. Keep failed or unknown
   cleanup explicit and separate from app-check results. Preserve the original
   Runner status and report; later host cleanup does not rewrite an incomplete
   run or turn it into a pass. Do not stop a shared or unrelated process.

For an explicit execution-only task, use `loki_runner_execute`, `loki_runner_get`
and `loki_runner_stop`. For tests run by Codex or another tool outside Kaijan,
use [assess-test-evidence](../assess-test-evidence/SKILL.md). These independent
paths do not replace the normal combined test flow.

For detailed browser review, Playwright tracing is on by default. If trace.saved is
true, open nativeResult.trace.path from the package root with its pinned tools:

```sh
./capabilities/runtime/node ./capabilities/library/node_modules/playwright-core/cli.js show-trace \
  --host 127.0.0.1 --port 0 "/absolute/path/from/nativeResult.trace.path"
```

Keep the viewer process alive while reviewing its task tab; close that tab and
stop only that viewer process afterward. Keep raw traces local. Browser trace
content and provider HTTP/request records are separate. Each execution has an
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
Read native screenshot/action/log artifacts for diagnostics; Playwright's viewer
applies only to browser traces. Report the call and action list, input count and
estimated USD per 10,000 inputs. A model completion is not a verified test pass.

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
