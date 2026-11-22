---
name: plan-tests
description: Propose practical tests for the caller's task and available application, source or change context. Use for test planning, including planning with risk review. Planning stays separate from execution.
---

# Propose tests from current work

Use the [shared Product MCP guidance](../../references/local-capabilities.md)
and the readiness returned by `kaijan_capabilities_list`. Use `kaijan_plan_create`
to plan useful observable checks and expected results for the original task.
<!-- codex-only -->

In Codex, use `kaijan_test_inputs_read` to find and reuse the application under
test, its Test Environment and its Test Data.
Use a suitable existing record when available. Save the browser URL or Mac
app bundle identifier and app account in Test Environment. Save the test
values as the caller supplied them in Test Data. Ask which saved record to use
when the caller's selection is unclear and the choice matters.

For a site that requires sign-in, check the selected environment for the
approved account before calling Plan. Guide the person to
[save the login locally](../../references/private-parameters.md#save-an-app-login-to-test-environment-config)
if it is missing or needs an update. For a supplied `.app` path or first-time
desktop setup, use the [macOS setup guide](../run-test/references/macos-appium-setup.md).

In Codex, pass the person's request as `testObjective` with a `requestKey`,
the saved `testEnvironmentId` and `testDataId` when needed. Kaijan uses the
saved target, account and data in Plan and Run. After Setup, use its saved
`application.workItem` as the objective and its resolved target to find or save
the environment for the selected AUT.

When the person selects an issue or pull request as the basis for testing,
read it through the host's authorized source access. Call Plan with `input`
in place of `testObjective`. Use the original `title`, `body` and `url`
for a single source. For more than one source, use the original work item and
the separate attributed `sources` in the advertised `pr-context-plan/3`
format. Keep the person's request and application details intact. Pass
authorized `repositories` or the original frozen `change` when needed so
Kaijan can prepare related work and risk inside Plan. If a source is
unavailable, keep its expectations unresolved.
<!-- end-codex-only -->

Tell the person Explorer's time limit before starting exploration. It defaults
to five minutes. Use `explorerTimeLimitMs` to allow more time when the task
needs it.
For work based on an already saved planning packet, pass its `contextId`.
Use the returned `planId` when the person authorizes a Run.

When the person selects the configured application's shared Main model, use
`sourceModel: {application: true}`. Core supplies one combined context for its
selected repositories. New planning reads the current model once. To continue
saved work, use the context recorded in that Plan. A fresh read returns the
current model even when the request includes an older `modelRef`.
Keep local changes and browser observations separately attributed. A source
model provides optional inferred context. Browser-only testing remains available.

Include steps and preconditions when the available information supports them.
Keep missing details open. A task in chat is enough to plan.

## Planning inputs

On Codex, use the advertised fields above and the original user request.
For hosts that advertise `input` and `contextId`, use the following planning
input guidance. For browser exploration on those hosts, provide the authorized
URL in `exploration.target.initialURL` and any supplied exploration parameters.

Use one supported input form. Preserve original text, attribution and source
roles. Put application behavior and context in `input`. Include the optional
`taskInstructions` only when the caller supplied directions for carrying out
the testing work. Omit the field otherwise. Kaijan retains those directions
with the Plan and carries them into Run. Preserve supplied source
documents unchanged. Include the known execution target as context.
Implementation, risk findings and observations can inform
the plan.

- For a single work item, supply its original `title` and `body` in `input`.
  Include a real source `url` or existing source-file URI and pointer when
  known, and original revision, author and capture claims when supplied. Omit
  absent fields. An application target is context, separate from the work
  item's source URI. For multiple sources, use the complete `pr-context-plan/3`
  packet and its separate `sources` items. A simple input with `sources` or
  `version` is interpreted as a versioned packet.
- If the caller requests additional host analysis, attribute it in
  `agentInstructions`. For ordinary testing the original task, target and
  sources suffice. Explorer discovers routes and Planner chooses scenarios.
- Use `change` for the actual frozen change, including source identity, coverage
  and files. See the [change input contract](../../references/LOCAL-CHANGE-INPUT.md)
  for Git patches and provided snapshots. Kaijan prepares risk analysis and
  resolves missing explicit in-scope GitHub links during planning. Include any
  relevant source already available. Supply `repositories` only for authorized
  related-work discovery, with the original work item's repository first when
  known.
- Reuse an exact saved risk answer with
  `riskAnswers: [{family, answerId, resultSha256?}]` (family `changeRisk` or
  `riskFinder`). Use `procedures` for relevant past steps, either
  `{title, steps, uri?, revision?}` or `{runId, resultSha256?}` for a saved
  Run in this conversation. These steps are historical context. Keep any
  unavailable history as a coverage gap.
- A retained `contextId` can supply `nativeInputs.testPlanning` with the
  supported input and optional arguments. If the record is incompatible, use
  the original supported input when available. A raw report is retained evidence,
  not a planning packet.

After Setup, read relevant source at its saved revision. Keep code and task
context in separate attributed sources when needed. Use a Context Intake ID
for Plan's `contextId`. Setup IDs and `application.contextId` identify saved
application context.

On hosts where Plan accepts `input`, use the saved `application.workItem` as
the original task. For a saved free-text task, preserve it in `input.body`.
Use the original task text for `input.title` when no title was supplied.
A known pre-dispatch context-input refusal asks for corrected arguments. Reuse
the saved task instead of asking the person to retype it or writing an unsaved
substitute plan. Preserve an earlier uncertain outcome without replay.

On hosts that advertise it, `options.deadline_ms` covers preparation and planning. Follow
[completed-answer reading](../../references/RESULT-READING.md) for cancellation
and result paging. Recover a lost reply with the original optional
`requestKey` and identical input and configuration. An offered
`new_analysis_if_needed` is a separate read-only attempt that requires caller
scope for new analysis. Preserve the original result or uncertainty.

If the host ends its wait during browser exploration, Kaijan closes Explorer
and continues the original Plan with the map it saved so far. Recover it with
the identical request and configuration. An observation timeout alone leaves
the original wait active. Keep waiting if the person still wants exploration.

## Show the plan

Read the returned plan, checks and receipt or the original producer failure.
Keep assumptions distinct from supplied requirements. Explain an assumption
when it affects a check. Identify specific missing requirements or sources
that block checks, using the returned clarification or source request.
Present partial coverage and a plan with no tests as recorded. Show the saved
Test plan through [review-report](../review-report/SKILL.md) with its exact `answerId`,
`resultSha256` and original title. Proposed steps are unexecuted.

## Revise a plan when new design evidence changes an expectation

Create a revised plan from the original intent, new source and affected original
tests, attributed by Plan answer ID and digest. Include the discrepancy so the
new Plan can explain it in `disagreements`. A retained context revision uses a
new record with `supersedes`. Verify the revised expectations against the new
source and show the revised report under its own answer ID. Preserve the
original plan and report.

For requested additions, use the same Plan flow. Keep the original objective,
authorized context and tests, then include the new coverage the person requested.
Save and show the revision with its own Plan ID. Earlier Runs keep their original
Plan references.
