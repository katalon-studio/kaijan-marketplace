---
name: drawdb-demo
description: Run the installed Kaijan QA newcomer demo or the DrawDB PR1184 Subject areas walkthrough that creates Sales, renames it Orders and deletes it. Other app testing and analysis use their own skills; a request only to plan this example never executes it.
---

# Try the Kaijan QA demo

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

Welcome the newcomer briefly: this demo plans a small DrawDB change, operates a
disposable diagram, assesses the actual evidence and opens a report in Codex.
For example, a newcomer can ask:

> I need to test Subject areas in https://github.com/drawdb-io/drawdb/pull/1184
> on my DrawDB editor. Check that I can create Sales, rename it Orders and delete
> it. Plan the tests, run them on a new diagram and show me the results.

Use an actual supplied editor URL when known. Suggested prompts describe the
caller's work and desired result; the caller need not name tools, internal phases,
schemas or IDs, or supply an implementation/observer checklist.

Use the installed [test-request](../test-request/SKILL.md) to carry the request
through its supported stages. This skill supplies the selected example and
walkthrough; that skill owns composition, original references, Stop and recovery.
Do not copy its workflow or require another instruction for each internal stage.
If the caller asks only to explain or plan the demo, honor that narrower request.

## Select this example and resolve readiness

The demo example is [DrawDB PR1184](https://github.com/drawdb-io/drawdb/pull/1184),
“Feat/subject areas”, at source revision
`f47a5b2500c4448cfc34b5ce7023caf215dbcf94`. Acquire the actual selected PR and
relevant source through available authorized reads. Its upstream body is empty;
the lifecycle below is demo-authored intent, not text supplied by the PR. Keep
source acquisition and the actual served application revision distinct. Disclose
an unavailable or mismatched revision; do not silently reset a checkout or claim
that a PR link proves which application build is running.

Retain those actual PR metadata/files reads through [context-handoff](../context-handoff/SKILL.md)
as `nativeInputs.reportSources` (`loki.report-sources/1`). Select its returned
`sourceContextId` whenever creating this PR's initial Plan or final mixed report
with `loki_report_show`, following
the [PR source/report contract](../review-report/SKILL.md). A generic text context
or the report title alone does not populate the Pull requests list. Returning
from details must read the same captured PR; do not invent a row or refetch/retest
to fill it. Keep Runner source/check bindings when those checks are authored.

Check `loki_capabilities_list` for the responding installed runtime and the actual
Planning, Runner and Assessment configuration. Configuration present is not a
validated provider call. Use the installed [readiness and private recovery
guide](../../references/local-capabilities.md#read-runner-readiness-without-execution)
for missing/invalid fields and supported reconnect after reconciling admitted
runs. Never ask for a key in chat or change provider/permission mode. Core OAuth,
a complete map and unrelated GitHub access are not prerequisites.

Reuse the caller's current selected DrawDB folder/URL when known and correct.
Check the actual reachable editor target before dispatch. A local checkout may
be started with its documented development command when that target and process
start are within the caller's grant; preserve its source and existing consumers.
Do not assume a port, scan the machine, clone another app or select a cloud target.
For a consequential unresolved input, ask one focused native Question, such as
which DrawDB editor URL to use, and continue only independent requested work while
it is unanswered. Explain a failed target check and its concrete recovery.

This is an already-installed plugin walkthrough. Missing Local tools follow the
installed Setup skill's connection/reconnect guidance. If the package lacks this
skill or a required capability, identify the missing support and direct the caller
to update/install the complete Kaijan QA package through Codex Plugins, then
refresh or use a fresh chat as needed. Do not rebuild, reinstall, initialize a
workbench, sign in to Core or alter host caches automatically to run this demo.

## Supply the complete demo request

Retain the caller's actual words and these separately attributed example criteria:

- Use only the selected DrawDB editor and PR1184 source context. Work in a new
  disposable browser profile/diagram; preserve existing diagrams and user data.
- From the empty Subject areas state, create one area named **Sales**. Observe
  its row and canvas representation.
- Rename that same visible area to **Orders**, without adding a second area.
  Observe the changed name in the row and canvas. Visible continuity does not
  establish a stable persisted area ID.
- Delete only the area created by this attempt. Observe its row/canvas removal
  and return to the empty Subject areas state.
- Retain actual observations at empty, Sales, Orders and deleted milestones
  through the existing supported Runner screenshot/action/trace evidence. Do
  not change the engine or add a recording/replay integration.
- Assess the original outcomes and evidence, then show the actual Plan, selected
  Run and Assessment in the native report. Disclose proposed tests not executed.

Select the complete lifecycle scenario from the real Plan and pass its full fields
and exact Plan reference to Runner. Explain each stage briefly as it happens in
ordinary language. Read the original milestone artifacts through supported host
artifact/file tools when accessible and attribute those host observations
separately from the original Runner output. References alone are not inspected
images; final empty-state checks alone do not prove creation or rename. Report
incomplete evidence or a failed step honestly, without replaying uncertain actions.
Keep native Unverified, actual Product checks and Assessment conclusions distinct.
Do not manufacture pass/fail, whole-PR coverage, per-step verdicts, Quality, test
source or persistence proof to make the demo look complete.

## Leave a usable result

Show the retained report through [review-report](../review-report/SKILL.md).
Tell the newcomer to select **Show details** on the inline card for Codex's native
side panel. Reopening selects the same saved report and starts no new test or
producer. **Pull requests** returns to that report's captured PR list; selecting
PR1184 again reads its same details. Preserve the exact report ID and original
producer references.

Finish with the observed result, any missing evidence and how to view that report
again. A caller can say “Run the Kaijan QA demo with DrawDB again” for an explicitly
new attempt with a new disposable diagram and execution key; reopening, a late
answer or recovery of a lost reply is not that request. Honor Stop throughout.
