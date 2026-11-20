---
name: run-test
description: Run and assess an authorized browser or macOS desktop test, read its result, or stop the same test. Use for saved Plan tests.
---

# Run saved Plan tests

Use the [shared Product MCP guidance](../../references/local-capabilities.md)
and the [Runner contract](../../references/RUNNER.md). A full caller request
can already authorize the selected target and actions. Save the Plan with
[test-request](../test-request/SKILL.md), including when the person supplies a
complete scenario in chat. A plan-only request
does not authorize execution.

## Run the selected checks

Check readiness for the selected action with `loki_capabilities_list`.
Follow the installed Setup [AI access guide](../setup/references/provider-setup.md)
for the responding package when starting AI work. Managed AI uses the Kaijan
grant and an explicit direct-development build uses its local provider setup.
Target application login is separate. Saved-result reads and Stop use the
available Local tools without a new AI request.

Kaijan supplies saved Configuration groups automatically when available. Use
the application and task to select the relevant settings. Follow the person's
explicit Configuration selection or opt-out. If several saved groups match the
application and the intended group is unclear, ask which to use.

Save an ordinary value through `kaijan_configuration` only if the person asks to
save it. For a new or changed secret, use [private login parameters](../../references/private-parameters.md)
or manual login. Keep raw secrets out of chat and tool arguments. On hosts that
advertise full Runner input, use `params` for ordinary overrides and
`privateParams` for scoped secret references.
These overrides leave saved settings unchanged. The person can run without
saving settings. Configuration selection never authorizes execution.

Use `loki_test_execute` for the normal combined run, assessment and report.
When Codex advertises `planId`, supply the exact `planId` returned by Plan,
the selected `testIds`, and a fresh UUID as `requestKey`. Kaijan loads the
target, test data and private configuration references from the saved Plan.
If the person changes the target or test data, save a Plan using those inputs
before running it. For an interrupted request, reuse the same key.
Tell the person the Run's time limit before starting it. Runner defaults to ten
minutes. Use `runnerTimeLimitMs` to allow more time when the task needs it.

For hosts that advertise the full Runner input, follow the instructions below.
Supply a fresh UUID as `requestKey`, the scenario ID, explicit `params` (or
`{}`) and the authorized target. For one saved test, use its actual test ID as
`scenarioId`.

- `savedTests: {answerId, resultSha256, selectedTestIds}` loads the complete
  selected Plan tests. Include the person's current request to run them and any
  changed instructions in `guidance`, preserving their wording and concrete
  limits even when no test steps changed. Keep the saved Plan and application
  restrictions intact. Do not invent permission or copy the whole chat.
  Add other relevant caller knowledge in `hostContext` separately.
  This input cannot be combined with `scenario` or `planRef`.

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
`loki_test_stop` to stop the same test.
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

Supply `target.app` with the app's bundle ID in the Codex Plan. Use
`executionMethod: "desktop-ui"` and the app target on hosts that advertise the
full Runner input. If the caller supplies a `.app` path or needs first-time setup,
use the [macOS setup guide](references/macos-appium-setup.md).
Set `target.launch: true` only when launch is allowed.
`false` requires a running app. Desktop requires configured full Xcode, UI Automation and
Accessibility permissions, an unlocked GUI and the app on the main display.
Appium/Mac2 are packaged. Use `desktopInputs` for the input limit. The app
keeps its state and stays open after the run. Browser clarification and
Playwright trace do not apply to desktop.

## Saved terminal observations

Kaijan retains Runner observations for the normal Planner assessment and report.
Do not supply caller-authored terminal predicates or verdicts. Old saved terminal
verification stays readable with its original attribution; reading it does not
execute or reassess a test.
