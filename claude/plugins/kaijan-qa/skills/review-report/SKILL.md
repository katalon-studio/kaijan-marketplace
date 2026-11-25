---
name: review-report
description: Find this project's past saved Kaijan Plans, Runs and reports, including in a new Claude Code chat, or read an exact saved result without executing or reassessing work.
---

# Show a saved report

When the person asks for this project's past saved work, use
`kaijan_project_history_manage` with `operation: "list"`. Follow its `nextCursor` to
read older entries. Open a selected entry with `operation: "read"` and its
exact `entryId`; keep using that history reader for projected evidence pages.
It reads the original records without repeating planning, execution or
assessment. A normal original-chat reader name in retained data does not grant
cross-chat access. Report entries use the native card and its existing history details reader.

History is bound to the host's selected project and current Kaijan account,
workspace and profile. Do not supply paths or another chat's identity. If
history is unavailable, explain the specific missing context and keep existing
original-chat tools available; do not rebuild history by rerunning tests.
Older unbound work remains in its original chat. Only when the person asks to
add that existing report to this project's history, use `operation: "remember"`
with its exact `reportId` in the original chat. This associates its original
references; it does not create or rewrite a report. Do not scan transcripts or
other conversation stores, silently assign old records, or copy raw evidence.

For an exact report already in this chat, use the existing reader:
Use the exact retained reportId or original answer/run IDs from this chat.
Call `kaijan_report_show` with that exact saved `reportId` after the test ends.
For original answer/run IDs, it can save their read-only report snapshot.
The plugin's inline card shows the saved result. **Show details** opens the
shared report HTML. Desktop Code uses Claude's standard browser link. The
interactive CLI opens the default browser. Resume the original conversation
after restarting Claude to use the same saved report. Project history and the
CLI browser fallback use the native pane.

The interactive report uses Kaijan's shared report renderer. Its private
browser link stays on this device and is available while the session serves
the report. The card and its actions do not send a
prompt or start a test, assessment or sign-in. When Claude truncates a large tool
result, Kaijan reads the same saved report through its existing Local connection.
Do not run another test, reassess, or open a different report to recover missing
details.

The card uses Claude mods in the interactive CLI and local Desktop Code.
`--print` has no visual interface. If mods are disabled or the view is unavailable,
read the same saved report as text with `kaijan_report_get`. Do not claim a card,
browser or pane rendered without observing it.

Use **Kaijan feedback** on the card to request a private editable draft in a new
chat turn. Use **Report issue** for a problem with Kaijan itself. Claude opens
the requested draft with the matching draft tool. Edit and review the form
in chat. If the interactive CLI uses the fallback pane, press Ctrl+X then
Tab to edit.

The issue form shares the user's reviewed text and images with the Kaijan team.
Use **Choose images** to select PNG, JPEG or WebP files for this draft. Review
the text and selected images with **Preview issue** before choosing
**Send issue**. Use the original draft to recover an unconfirmed submission.
Only the person can send feedback or an issue from its form. The saved form
offers **Copy reference**. For feedback opened from a report with one eligible
Run, **Include Run details** starts off.

Lead with what was checked and the actual result. Show concise test titles,
expected and observed behavior, useful evidence and any specific next action.
A proposed check is not an approved requirement. A finished run is not a pass.
Keep inconclusive, failed, stopped and partial results distinct. Missing details
stay missing; never invent a result to fill the report. A standalone Run has no
invented Plan: its results stay in Runs.

Read the selected test's saved result before calling its judgment unavailable.
Browser judgments are in the selected Run's
`executionReport.test_results`, matched by `test_id` to `selectedTestIds`.
When no separate linked assessment takes precedence, `bug_found: true` means
Failed; otherwise `scenario_finished: true` means Passed, and an unfinished
scenario means Incomplete. Keep its `actual`, `execution_details` and `warning`.
Empty `assessments` lists and the Run-level `testVerdict: "unverified"` do not
erase those per-test judgments. Do not report a missing saved verdict from
those fields alone or list the absence of a separate review as missing work.
Use these test results in ordinary summaries as well as detailed tables.
Do not replace a judged test's result with the Run-internal `unverified` label
in the heading, status or summary. State **Incomplete** and the unfinished work
when its saved browser row says the scenario did not finish and found no bug.
A Run with no matching judgment still has only its supported
observations; execution completion alone is not a Pass. Follow the same rule
for original-chat reads and project-history reads.

Read selected saved artifacts with `kaijan_report_read_artifact` when useful.
Retain their source attribution and original identities. Text retrieval is not
proof that a user saw a native report panel, and must not create a visible-render
acknowledgement.

For an authorized request to view a saved browser recording, call
`kaijan_report_trace` with its exact `reportId`, Runner `runId` and
`action: "launch"`. `action: "status"` checks availability without opening a
viewer. Retain a supplied `caseTarget`; do not guess a case or occurrence.
The local viewer includes original sign-in steps. A filtered artifact reader's
privacy refusal does not establish that this viewer is unavailable. Give the
trace tool's actual refusal when it cannot open the recording. Do not open a
trace ZIP through the artifact reader or run a shell command from a returned
path. Do not claim that the viewer rendered without observing it.

Keep the viewer available while the user reviews it. When finished, close the
temporary viewer tab and use `kaijan_report_trace` with `action: "close"` for the
same report/run. This closes the viewer and preserves the original recording,
results and verdict. No new application run, assessment or Kaijan sign-in is
needed to read that retained local trace.

If the original report is unavailable, return to its original Claude Code
session. Do not replay the test to recreate it. Session resumption uses the
host's own session ID; never select another chat through tool metadata.
