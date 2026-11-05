---
name: application-setup
description: Save the selected application source, work item and optional target during Setup. No map generation or mapping provider is required.
---

# Prepare application context

Use the selected application, project and original goal in this conversation. Read the shared [Product MCP guidance](../../references/local-capabilities.md). Do not scan the machine for an application, change permission mode, or delegate this Setup lifecycle to another chat.

This dogfooding release does not build application maps. Setup, risk analysis, functional/change-impact planning and Runner can use supplied work-item and code context without a map. Do not call a map builder, request mapping credentials, wait for map readiness or create a placeholder map.

## Save and read the configuration

Use `loki_setup_list` for the selected canonical source directory when a matching saved configuration may exist. Use `loki_setup_prepare` for a new configuration with one stable requestKey, the explicit source directory and revision selection, the original workItem when supplied, and an optional target. A target is not required for planning or source context.

For a new source selection, default to latest main. Honor an explicit branch, PR ref or commit. The host resolves it once without switching the checkout or executing source. Keep its exact returned SHA for recovery and resolve; do not call an old local tip latest when the upstream is unavailable. Setup records a committed-source selection; it does not capture dirty working-tree bytes. A later task using dirty source must retain those bytes and digests separately.

Check `isError` and `structuredContent`. Read the returned applicationId/contextId with `loki_setup_get`. Check the saved source, work item and optional target in the advertised customer result. A `ready` Setup state means the selected configuration was saved. It does not prove application access or a passed test. Do not require private storage, map or authorization fields that are absent from the customer result.

Use `loki_setup_resolve` with `expectedRevision` from the saved configuration's source revision. When `loki_setup_get` returns `configuration.target.profileRevision`, also pass that exact value as `expectedProfileRevision`. Omit it only when the saved configuration has no target-profile revision. Do not guess or generate a replacement revision. Check the returned readiness: `configured`, `browserObserved: false` and application coverage `not-verified` describe saved context, not observed application behavior. Retain the original work item and configuration references. Saving context grants no test, browser or source-transfer action. Preserve a pending or refused application connection and its stated recovery; do not present it as accepted.

A matching request recovers its original record across reconnect. Conflicting input under a requestKey refuses. Change the selected source or goal only as a separately authorized new configuration. Do not rewrite the old record.

## Continue the requested task

Use the installed `assess-change-risk`, `plan-tests`, `run-test`, `find-related-work`, `context-handoff` or evidence/report skills when they fit the user's request. They keep their own inputs, model/runtime requirements and action authority. Do not make Setup or a map a prerequisite for an otherwise complete independent request. Risk and planning can start from the original work item and attributed code context.

Continue through the selected feature. Setup is not a separate handoff gate.

## Recovery and Stop

Use `loki_setup_get` to read the original context. Fresh Setup returns its saved configuration directly; there is no background job to poll or stop.

Historical mapping records remain retained. This release does not resume them or convert them into ready configurations. Preserve their actual state, result references and unknown effects. A finished wait or an interrupted chat does not prove that historical work stopped. Retry only known failed, stopped or blocked configuration work when its prerequisite changes or the user requests it.

## Finish in the same conversation

Confirm the actual saved configuration or concrete blocker in simple English. Do not narrate internal calls or progress. Continue the user's selected task when its real inputs and authority suffice. When the next action is open, follow the installed Setup skill's contextual native Question guidance. Missing provider configuration belongs beside the selected analysis or Runner action, not as a universal Setup gate.
