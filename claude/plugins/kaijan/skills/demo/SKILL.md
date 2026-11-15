---
name: demo
description: QA-only demonstration of Kaijan with a short real TodoMVC plan, browser test and saved report. Use when the person explicitly asks to try the Kaijan demo or invokes this skill. Ordinary testing requests and questions about the demo do not start it.
---

# Try Kaijan on TodoMVC

This skill is available only in QA. Before planning or calling testing tools,
run the installed profile helper:

```sh
"${CLAUDE_PLUGIN_ROOT}/capabilities/runtime/node" "${CLAUDE_PLUGIN_ROOT}/hooks/demo-profile.mjs"
```

Continue only when it returns `profile: "qa"`. The normal package's raw build
file contains its default, not necessarily the selected runtime profile. If QA
cannot be confirmed, explain that this demo requires QA and stop. Do not switch
the person's profile, account or grants.

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

In a fresh browser session, add **Buy apples** and **Buy tea**, then complete
only **Buy apples**. Check all three filters:

- **Active** shows only Buy tea, unchecked.
- **Completed** shows only Buy apples, completed.
- **All** shows both items with those completion states.

These are the demo's criteria, not observations of an already completed test.
Use only disposable demo todos. If the person supplies a different target or
constraints, preserve their choice and resolve a consequential conflict rather
than silently switching applications. If this public example is unavailable,
explain the problem; do not substitute a local app or a prepared result.

## Show the workflow and result

Use [plan-tests](../plan-tests/SKILL.md) to save a small plan for this scenario,
with the target and demo criteria attributed as task context. Show its proposed
checks briefly. Use [run-test](../run-test/SKILL.md) to run the exact saved case
or cases for this scenario and assess the actual observations. Planning remains
a separate operation; a complete scenario does not skip the requested demo Plan.

Continue reading the same Run through execution and assessment, keeping the
interactive CLI session open while it works. Give short progress updates without
asking the newcomer to manage tool IDs. Follow the original Run's Stop and
uncertain-response recovery; do not start replacement work to manufacture a pass.

Show the final saved report through [review-report](../review-report/SKILL.md).
Summarize what Kaijan actually checked and its outcome, including failures or
incomplete evidence. Let the person inspect Show details in a supported native
host; retain readable text in a terminal or headless session. Reopening the
report reads that same result without planning, execution or assessment again.
End with a short explanation that they can ask Kaijan to test their own app next.

The demo does not fix the public app, install or update software, change account
grants or permission modes, publish an issue, or submit feedback.
