---
name: plan-tests
description: Use when the user asks to plan tests, create a test plan, or propose tests for local code, an application, an issue, or a pull request, including short planning requests that omit the name Kaijan. Save the proposed Kaijan plan without running tests.
---

# Propose tests from current work

Use the [shared Product MCP guidance](../../references/local-capabilities.md)
and the readiness returned by `loki_capabilities_list`. Use `loki_test_plan`
to plan useful observable checks and expected results for the original task.
When the caller wants browser-based planning for a selected web target, pass
its URL and allowed hosts in `exploration.target`. Kaijan's Explorer builds the
app model during planning. Pass the caller's original task and any supplied
parameters. The testing method is already part of the agents.

Include steps and preconditions when the available information supports them.
Keep missing details open. A task in chat is enough to plan.

## Planning inputs

For a planning request in chat, use the caller's original wording in `input.body`, including their constraints. Keep proposed checks and assumptions separate from the caller's requirements. Leave unspecified behavior open for Kaijan to plan from the available evidence.

Use one supported input form. Preserve original text, attribution and source
roles. Put application behavior and context in `input`. Put the caller's
application-testing directions in `taskInstructions`: application actions,
expectations, permissions and restrictions. Kaijan retains these with the Plan
and carries them into Run. Keep requests to assess the Run, save the Kaijan
report or reopen it in your Kaijan tool workflow, rather than duplicating them
in `taskInstructions`. Preserve the complete original request in `input.body`.
If the task tests the application's own report, save or export feature, keep
those application actions and expectations in the testing directions. Distinguish
the recipient and purpose; do not filter words such as report or save. Preserve supplied source
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

After Setup, use its saved `application.workItem` as the original task and read
relevant source at its saved revision. For a saved free-text task, preserve it in
`input.body`; use the original task text as `input.title` too when no separate
title was supplied. Keep available code/context in separate attributed sources
when needed. Setup IDs and `application.contextId` select configuration, not
`nativeInputs.testPlanning`; do not pass them as the planning `contextId`.
A known pre-dispatch context-input refusal asks for corrected arguments. Reuse
the saved task instead of asking the person to retype it or writing an unsaved
substitute plan. Preserve an earlier uncertain outcome without replay.

The optional `options.deadline_ms` covers preparation and planning. Follow
[completed-answer reading](../../references/RESULT-READING.md) for cancellation
and result paging. Recover a lost reply with the original optional
`requestKey` and identical input and configuration. An offered
`new_analysis_if_needed` is a separate read-only attempt that requires caller
scope for new analysis. Preserve the original result or uncertainty.

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

## Preserve a baseline while adding tests

When the experimental `loki_test_supplement` tool is available and additions
are requested, use `test-plan-supplement-input/1` with the original `context`,
`baseline: {text, uri, revision, plan_path?}` and
`risks: [{id, text, uri, revision, attribution}]`. Supply the exact original
baseline JSON in `text` and use `plan_path` for a wrapper when needed. An empty
`risks` array is valid. Retained input uses `nativeInputs.testSupplement:
{input, options?}`. Keep the baseline unchanged beside the returned additions,
concerns and questions, or the original failure.
