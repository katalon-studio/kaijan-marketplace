---
name: test-request
description: Use Kaijan to test a selected application or review a change and test its behavior. Also handles requests to review requirements or risks and plan tests. Covers the requested plan, run, assessment, authorized fixes and report.
---

# Carry the testing request to its result

Use the [shared Product MCP guidance](../../references/local-capabilities.md).
Keep the caller's original task, selected application and any source, target and
action constraints. A broad request to test a supplied URL provides a task and
target. Choose useful checks within that scope and keep unknown requirements
open. A plan-only request ends at the plan. A full test
request with sufficient inputs can proceed through execution and report under
the same authority.

- Use [plan-tests](../plan-tests/SKILL.md) for requested planning or to prepare
  tests for a full request. Give it the original task and relevant attributed
  sources, including the actual frozen change when the request concerns a
  change. Cover ordinary requested behavior and acceptance conditions as well
  as relevant risks. Keep assumptions distinct from supplied requirements.
  Open the saved Test plan with [review-report](../review-report/SKILL.md).
  A complete caller-supplied scenario can use [run-test](../run-test/SKILL.md)
  directly. Standalone code review uses
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
available. Ask a native host Question only for consequential missing inputs
or decisions. Continue work that can proceed independently. When a task
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
