---
name: run-test
description: Run selected tests from a saved Kaijan Plan in a browser or macOS desktop app. Read the result, reopen its report, or stop the same Run.
---

# Run saved Plan tests

Use the [shared Product MCP guidance](../../references/local-capabilities.md)
and the [Runner contract](../../references/RUNNER.md). A full caller request
can already authorize the selected target and actions. Save the Plan with
[test-request](../test-request/SKILL.md), including when the person supplies a
complete scenario in chat. A plan-only request
does not authorize execution.

When the person requests one saved test, compare the requested action and
outcome with the saved test steps and expected results. Send only the matching
test's ID. If no single test clearly matches, ask which one to run before
dispatch.

## Run the selected checks


Check readiness for the selected action with `kaijan_capabilities_list`.
Follow the installed Setup [AI access guide](../setup/references/provider-setup.md)
for the responding package when starting AI work. Managed AI uses the Kaijan
grant and an explicit direct-development build uses its local provider setup.
Target application login is separate. Saved-result reads and Stop use the
available Local tools without a new AI request.

Save an ordinary value through `kaijan_test_environment_manage` only if the person asks to
save it.


Keep raw secrets out of chat and tool arguments. Use the app login selected
when saving the Plan. Choosing a login does not authorize execution.


Use `kaijan_run_start` for the normal combined run, assessment and report.
Supply the exact `planId` returned by Plan, the selected `testIds`, and a
fresh UUID as `requestKey`. Kaijan loads the
target, test data and private configuration references from the saved Plan.
Put the person's current Run instructions and limits in `runInstructions`.
If the person changes the target or test data, save a Plan using those inputs
before running it. For an interrupted request, reuse the same key.

Keep requested in-app cleanup in the Plan's test steps. App sign-out requires an
explicit request. Runner records cleanup of its own browser. The host owns
cleanup of test processes it started and revocation of a temporary private
login binding when the task no longer needs it. Verify that cleanup separately
from the test outcome.


## Read or stop the original test

Use `kaijan_run_get` to read the same Run until it finishes or needs an
answer. Use `kaijan_run_stop` to stop that Run. Open its saved report with
[report review](../review-report/SKILL.md) using the final `report.reportId`.

When `nextAction` asks for input, inspect the browser's retained clarification.
Only a live clarification can resume. Use `kaijan_run_answer` with the
original run and clarification IDs, one answer key and the available authorized
context.


Match known questions when possible; partial answers and extra JSON
context remain usable. Use available authorized context and suitable generated
test data to answer. Mark sensitive supplied values with `sensitiveQuestionIds`.
A missing answer does not require discarding other context or stopping
independent work. See the [clarification contract](../../references/RUNNER.md#browser-clarification-and-recovery-contract-2334)
for delivery and readback.

Recover a lost reply with the same key and full original input. A new execution
uses a fresh key only after admitted work is settled, effects are known and the
caller scope still authorizes it. For a blocked sign-in redirect, use the
retained blocked host and actions. If the saved target needs an updated
sign-in setting, save a Plan with that setting before starting another Run.
For `runner_worker_launch_failed` with `not-executed`, retain the failed receipt,
reconnect and verify the responding package before starting a new authorized
run. Do not replay unknown actions or effects. Stop requires original readback
for the actual cancellation, partial evidence and cleanup.

Keep execution status, actual results, assessment and cleanup distinct.
Runner saves a judgment for each selected test. Use ordered full-result
reads when more evidence is needed. For customer wording, follow
[Present assessed results](../../references/assessed-result-language.md).
Use [the saved browser trace](../review-report/SKILL.md#view-a-saved-browser-trace)
to inspect an existing recording.

## macOS desktop tests


Select the Mac app when saving the Plan. If the caller supplies a `.app` path
or needs first-time setup,
use the [macOS setup guide](references/macos-appium-setup.md).
Permit app launch in the Plan only when authorized. Desktop requires
configured full Xcode, UI Automation and
Accessibility permissions, an unlocked GUI and the app on the main display.
Appium/Mac2 are packaged. The app keeps its state and stays open after the run.
Browser clarification and Playwright trace do not apply to desktop.

## Saved terminal observations

Runner saves observations and judgments with the Run. Older terminal
verification keeps its original attribution when reopened.
