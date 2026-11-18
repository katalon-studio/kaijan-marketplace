---
name: test-request
description: Help people learn what Kaijan can do and get started, or use Kaijan to plan tests, test an application or change, and report the results. Also handles review of requirements or risks, assessment, and authorized fixes.
---

# Carry the testing request to its result

Use the [shared Product MCP guidance](../../references/local-capabilities.md).

## Help the person get started

When the person asks what Kaijan can do or how to start, answer briefly in
terms of the result they can get: a test plan, an executed test, or a report
they can review. Use what they have shared to suggest a first action they
can take in this chat. Choose it based on their goal and the available
context. A change or behavior can lead to a plan, a selected test can lead
to running it, and a saved result can lead to reviewing it.

Make the suggested action easy to take. Give a request they can send and
reuse their stated target, source, selected test, or report. When an
application is known but the goal is open, help them choose what to check
without asking for the application again. With no useful context, give a
fillable request: “Use Kaijan to plan tests for [behavior or change].
Here is the context: [app address, ticket, or pull request].”

If the suggested action requires a connection you know is missing, explain
the existing connection step for this chat, such as **Set up** when available.
A question about capabilities alone does not start Setup, planning, or a test.
A question about what Kaijan did in a past Run asks you to explain that result.
When the person also explicitly asks for planning or execution, continue with
the requested work below.

## Carry out the requested testing work

Keep the caller's original task, selected application and any source, target and
action constraints. Identify the testing objective using the shared guidance
before choosing checks. Keep unknown requirements open. A plan-only request
ends at the plan. A full test
request with sufficient inputs can proceed through execution and report under
the same authority.

- Use [plan-tests](../plan-tests/SKILL.md) for requested planning or to prepare
  tests for a full request. Give it the original task and relevant attributed
  sources, including the actual frozen change when the request concerns a
  change. Planner derives scenarios from these inputs. Cover ordinary requested behavior and acceptance conditions as well
  as relevant risks. Keep assumptions distinct from supplied requirements.
  Open the saved Test plan with [review-report](../review-report/SKILL.md).
  Save a Plan for a complete caller-supplied scenario before execution.
  Standalone code review uses
  [assess-change-risk](../../references/capability-skills/assess-change-risk/SKILL.md).
- For authorized execution, use [run-test](../run-test/SKILL.md) with the exact
  saved Plan reference and selected test IDs, target and parameters. Kaijan
  runs the selected tests, assesses retained evidence and saves a combined
  report. Keep gaps for unexecuted tests visible and continue independent checks
  with sufficient inputs. For execution outside Kaijan or a specific new piece
  of evidence, use [assess-test-evidence](../../references/capability-skills/assess-test-evidence/SKILL.md).
- Open the actual saved result with [review-report](../review-report/SKILL.md).
  Include the review findings and any partial preparation when requested.
  Keep execution status, actual observations, assessment and coverage distinct.
  Preserve the selected Plan, Run and Assessment identities. Report the
  specific missing source or input if it blocks a requested outcome.

Check `loki_capabilities_list` for action availability and connection guidance.
Verify the responding build, inference and application access separately when
needed. Pass authorized related-work discovery scope to `plan-tests`.

Use the caller's selected or authorized sources and reuse context already
available. Ask a native host Question only when the task cannot be completed
without the person's answer. Continue work that can proceed independently. When a task
depends on the running application matching a local checkout, retain the actual
revision and dirty content digests, how the target was started, and observations
that connect the listener and served build to the source. Supply these as
attributed host observations with capture times and any gaps, separate from UI
evidence. Refresh affected observations after a source or server change.

## Fix and retest

If repairs are authorized, diagnose the observed mismatch in the selected
application and fix it within scope. Retest the failed and affected behavior
using the original tests and expectations. Add coverage separately when needed.
Keep the first failure and each retest as separate Runs with their actual source
and target. Preserve their report snapshots and link the selected original and
retest results in the final report. State what changed and what the retest showed.

For Stop or an uncertain reply, use the original operation's recovery path
in its owning skill. Preserve partial results and reconcile uncertain effects
before starting any separate execution.
