---
name: review-report
description: Read a saved Kaijan Test plan or test report in Claude Code CLI or local Desktop Code without executing or reassessing work.
---

# Show a saved report

Use the exact retained reportId or original answer/run IDs from this chat.
Call `loki_report_show` with that exact saved `reportId` after the test ends.
For original answer/run IDs, it can save their read-only report snapshot.
The plugin's native report card shows the saved result. **Show details** opens
the same report in Claude's **Kaijan report** pane, with **Tests** and **Runs**.
Use its test rows to review expected behavior and saved observations. Pane
navigation does not send a prompt or start a test, assessment or sign-in. When
Claude truncates a large tool result, Kaijan reads the same saved report through
its existing Local connection; it does not read a returned file path.
Do not execute, assess again, create an HTML export or open a browser preview.

The same plugin draws the card and pane in an interactive CLI and local Desktop
Code when Claude mods are enabled. Claude controls where the pane appears:
beside the conversation in supported wide layouts, or above the prompt in a
narrow terminal. `--print` has no visual interface. If mods are disabled or the
view is unavailable, read the same saved report as text with `loki_report_get`.
Do not claim a native card or panel rendered without observing it.

Lead with what was checked and the actual result. Show concise test titles,
expected and observed behavior, useful evidence and any specific next action.
A proposed check is not an approved requirement. A finished run is not a pass.
Keep inconclusive, failed, stopped and partial results distinct. Missing details
stay missing; never invent a result to fill the report. A standalone Run has no
invented Plan: its results stay in Runs.

Read selected saved artifacts with `loki_report_artifact_read` when useful.
Retain their source attribution and original identities. Text retrieval is not
proof that a user saw a native report panel, and must not create a visible-render
acknowledgement.

For an authorized request to view a saved browser recording, call
`loki_report_trace` with its exact `reportId`, Runner `runId` and
`action: "launch"`. `action: "status"` checks availability without opening a
viewer. Retain a supplied `caseTarget`; do not guess a case or occurrence.
The local viewer includes original sign-in steps. A filtered artifact reader's
privacy refusal does not establish that this viewer is unavailable. Give the
trace tool's actual refusal when it cannot open the recording. Do not open a
trace ZIP through the artifact reader or run a shell command from a returned
path. Do not claim that the viewer rendered without observing it.

Keep the viewer available while the user reviews it. When finished, close the
temporary viewer tab and use `loki_report_trace` with `action: "close"` for the
same report/run. This closes the viewer and preserves the original recording,
results and verdict. No new application run, assessment or Kaijan sign-in is
needed to read that retained local trace.

If the original report is unavailable, return to its original Claude Code
session. Do not replay the test to recreate it. Session resumption uses the
host's own session ID; never select another chat through tool metadata.
