---
name: demo
description: Demonstrate Kaijan with a real TodoMVC plan, two browser tests and a saved report. Use when the person explicitly asks to try the Kaijan demo or invokes this skill. Ordinary testing requests and questions about the demo do not start it.
---

# Try Kaijan on TodoMVC

Use the Kaijan service already selected for this session. Keep the person's
profile, account and grants.

Give a newcomer a short, real example of planning, testing and reviewing results.
Explain that the demo uses the public TodoMVC React example and a disposable
browser session. An explicit request to run this demo includes both planning
and execution of the scenario below. Respect a request for explanation or
planning only; do not run a test in those cases.

Use the existing [Kaijan guidance](../../references/local-capabilities.md) and
connection readiness. If a connection is missing, use the existing
[setup flow](../setup/SKILL.md). Keep the person's selected application and work
item intact: this demo supplies its own target and task, without replacing their
saved Setup or borrowing another conversation's records.

## Demo scenario

Target: https://todomvc.com/examples/react/dist/

Save two separate tests. Start with an empty list in a disposable browser.
Give each case its own disposable todos and remove leftovers from the first
case before starting the second.

1. **Filter active and completed todos.** Add **Buy apples** and **Buy tea**.
   Complete only **Buy apples**. Expect **Active** to show only Buy tea,
   **Completed** to show only Buy apples, and **All** to show both with their
   original completion states.
2. **Ask before clearing completed todos.** Add and complete **Buy apples**.
   Click **Clear completed**. For this demonstration, require a confirmation
   before removal. Observe what the app actually does and report whether it
   meets this stated requirement. Explain that this is an intentional demo
   expectation used to show how Kaijan reports an unmet requirement.

Use the actual observations to assess both tests. If the person supplies a different target or
constraints, preserve their choice and resolve a consequential conflict rather
than silently switching applications. If this public example is unavailable,
explain the problem; do not substitute a local app or a prepared result.

## Show the workflow and result

Use [plan-tests](../plan-tests/SKILL.md) to save a small plan for this scenario,
with the target and demo criteria attributed as task context. Show its proposed
checks briefly. Use [run-test](../run-test/SKILL.md) to select both saved tests
in one `loki_test_execute` request. Keep the Plan and the two test identities.
Planning remains separate; a complete scenario still needs the requested Plan.

Continue reading the same Run through execution and assessment, keeping the
interactive CLI session open while it works. Give short progress updates without
asking the newcomer to manage tool IDs. Follow the original Run's Stop and
uncertain-response recovery; do not start replacement work to manufacture a pass.

Open the final Run's saved `report.reportId` through
[review-report](../review-report/SKILL.md). The Run saves both outcomes under
that report ID. Reopen the same report to review them again.
Summarize what Kaijan actually checked and its outcome, including failures or
incomplete evidence. Let the person inspect Show details in a supported native
host; retain readable text in a terminal or headless session. Reopening the
report reads that same result without planning, execution or assessment again.
End with a short explanation that they can ask Kaijan to test their own app next.

The demo does not fix the public app, install or update software, change account
grants or permission modes, publish an issue, or submit feedback.
