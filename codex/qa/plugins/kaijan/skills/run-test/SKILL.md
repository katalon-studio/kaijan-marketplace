---
name: run-test
description: Run and assess an authorized browser or macOS desktop test, read its result, or stop the same test. Use for saved Plan tests or a complete supplied scenario. Explicit execution-only requests can use Runner directly.
---

# Execute an explicit UI scenario

Use the [shared Product MCP guidance](../../references/local-capabilities.md)
and the [Runner contract](../../references/RUNNER.md). A full caller request
can already authorize the selected target and actions. For testing that first
needs a Plan, use [test-request](../test-request/SKILL.md). A plan-only request
does not authorize execution.

## Run the selected checks

Check readiness for the selected action with `loki_capabilities_list`.
Follow the installed Setup [AI access guide](../setup/references/provider-setup.md)
for the responding package when starting AI work. Managed AI uses the Kaijan
grant and an explicit direct-development build uses its local provider setup.
Target application login is separate. Saved-result reads and Stop use the
available Local tools without a new AI request.

When `kaijan_configuration` is available, check for a matching Configuration
before asking the person to repeat settings. Reuse the matching set identified
by the task and available context. Name the selected set before Run. Ask the
person only when the task cannot be completed without their answer.

Save an ordinary value through `kaijan_configuration` only if the person asks to
save it. For a new or changed secret, use [private login parameters](../../references/private-parameters.md)
or manual login. Keep raw secrets out of chat and tool arguments. For one Run,
use `params` for ordinary overrides and `privateParams` for scoped secret references.
These overrides leave saved settings unchanged. The person can run without
saving settings. Configuration selection never authorizes execution.

Use `loki_test_execute` for the normal combined run, assessment and report.
Supply a fresh UUID as `requestKey`, the scenario ID, explicit `params` (or
`{}`) and the authorized target. For one saved test, use its actual test ID as
`scenarioId`. Choose one input:

- `savedTests: {answerId, resultSha256, selectedTestIds}` loads the complete
  selected Plan tests. Include the person's current request to run them and any
  changed instructions in `guidance`, preserving their wording and concrete
  limits even when no test steps changed. Keep the saved Plan and application
  restrictions intact. Do not invent permission or copy the whole chat.
  Add other relevant caller knowledge in `hostContext` separately.
  This input cannot be combined with `scenario` or `planRef`.
- `scenario` contains the full supplied test and optional `planRef` can
  correlate it. Standalone Runner also requires full scenario content.
  Keep required behavior, assumptions and observation-only questions distinct.
  Include known preconditions and inputs. Declare consequential missing values
  in `unresolvedInputs`; the operation will not execute with unresolved inputs.

Browser tests use `executionMethod: "browser-ui"` and `target.initialURL`.
Hostname restrictions are temporarily disabled for dogfooding. Do not require
a list of sign-in or redirect hosts. Keep any local port in the URL. Supply
credentials through [private login parameters](../../references/private-parameters.md)
and pass only their `privateParams` references. Browser session attachment
and persisted browser memory are unavailable. Use `options.headless: true`
when headless execution is requested. Optional limits can lower the advertised
bounds. Desktop requirements are below.

Keep requested in-app cleanup in the scenario. App sign-out requires an
explicit request. Runner records cleanup of its own browser. The host owns
cleanup of test processes it started and revocation of a temporary private
login binding when the task no longer needs it. Verify that cleanup separately
from the test outcome.

## Read or stop the original test

Use `loki_test_get` through the execution and assessment result, and
`loki_test_stop` to stop the same test. For execution only, use
`loki_runner_execute`, `loki_runner_get` and `loki_runner_stop`.
For external test evidence use
[assess-test-evidence](../../references/capability-skills/assess-test-evidence/SKILL.md).

When `nextAction` asks for input, inspect the browser's retained clarification.
Only a live clarification can resume. Use `loki_runner_answer` with the
original run and clarification IDs, one answer key and the available authorized
context. Match known questions when possible; partial answers and extra JSON
context remain usable. Use available authorized context and suitable generated
test data to answer. Mark sensitive supplied values with `sensitiveQuestionIds`.
The original deadline still applies; a missing answer does not require
discarding other context or stopping independent work. See the [clarification contract](../../references/RUNNER.md#browser-clarification-and-recovery-contract-2334)
for delivery and readback.

Recover a lost reply with the same key and full original input. A new execution
uses a fresh key only after admitted work is settled, effects are known and the
caller scope still authorizes it. For a blocked sign-in redirect, use the
retained blocked host and actions. A verified sign-in host can be included in
a new authorized run when the original confirms that login did not start.
For `runner_worker_launch_failed` with `not-executed`, retain the failed receipt,
reconnect and verify the responding package before starting a new authorized
run. Do not replay unknown actions or effects. Stop requires original readback
for the actual cancellation, partial evidence and cleanup.

Keep execution status, actual results, assessment and cleanup distinct.
A combined run assesses its retained evidence internally. Open its
`report.reportId` through [review-report](../review-report/SKILL.md), or show
standalone execution by its exact run ID and digest. Use ordered full-result
reads when more evidence is needed. For customer wording, follow
[Present assessed results](../../references/assessed-result-language.md).
Use [the saved browser trace](../review-report/SKILL.md#view-a-saved-browser-trace)
to inspect an existing recording.

## macOS desktop scenarios

Use `executionMethod: "desktop-ui"` and `target.app` with the app's bundle ID.
Set `target.launch: true` only when launch is allowed. `false` requires a
running app. Desktop requires configured full Xcode, UI Automation and
Accessibility permissions, an unlocked GUI and the app on the main display.
Appium/Mac2 are packaged. Use `desktopInputs` for the input limit. The app
keeps its state and stays open after the run. Browser clarification and
Playwright trace do not apply to desktop.

## Authored terminal checks

When authorized terminal checks are needed, supply `loki.terminal-checks/1`
in `checks` before dispatch. Use the exact Plan, digest and selected test IDs.
For PR-bound verification, retain the original authorized PR/files reads
through `nativeInputs.reportSources` and supply that `sourceContextId` and
actual PR head or merged revision. Follow the
[terminal-check/source contract](../../references/RUNNER.md#terminal-checks-and-pr-sources).
The tool evaluates terminal observations and records its own results. These
checks do not establish prior actions, viewport visibility or persistence.
Preserve them alongside the original Runner record and separate assessment.
