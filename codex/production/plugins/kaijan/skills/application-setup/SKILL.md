---
name: application-setup
description: Save the selected application source, original work item and optional target during Kaijan Setup.
---

# Save the selected application context

Use the selected project and original task in this conversation. Follow the
[shared Product MCP guidance](../../references/local-capabilities.md).
Setup saves source and task context. A target is optional. This release
does not build or require application maps.

- Use `loki_setup_list` for a possible saved configuration at the selected
  canonical source directory. For a new configuration, use
  `loki_setup_prepare` with the source directory, revision selection, original
  `workItem` when supplied, optional target and stable `requestKey`.
- Default a new source selection to latest main and honor an explicit branch,
  PR ref or commit. Keep the resolved SHA. The host resolves the committed
  source without switching the checkout or executing it. An unavailable
  upstream cannot verify latest main. Record dirty source separately when a
  later task depends on it.
- Read the returned application and context IDs with `loki_setup_get`.
  Use the saved source revision as `expectedRevision` in `loki_setup_resolve`.
  If the saved target has `profileRevision`, pass that exact value as
  `expectedProfileRevision`. The returned configuration and readiness describe
  saved context. Keep pending or refused connections and their stated recovery
  explicit. Browser behavior is still unobserved.

The returned Setup and `application.contextId` values identify saved application
configuration. They are not Context Intake IDs and must not be passed as
`loki_test_plan.contextId`. To continue planning, reuse the exact saved
`application.workItem` text as the original task in `input`, with relevant source
from the saved revision. Do not ask the person to repeat a task already saved.
If no original task is saved or supplied in chat, ask for that missing task.

A matching request recovers the original configuration. Use a new request
for a separately selected source or goal. Fresh Setup returns directly,
with no background job. Historical mapping records keep their original
state and are not resumed.

State what was saved or the concrete blocker. Continue the caller's selected
task when its own inputs and authority suffice. Independent analysis, planning
and testing can start without Setup when their inputs are already available.
