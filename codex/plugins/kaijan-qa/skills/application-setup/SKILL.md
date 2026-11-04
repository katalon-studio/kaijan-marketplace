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

Check `isError` and `structuredContent`. Read the returned applicationId/contextId with `loki_setup_get`. Fresh configuration uses `loki.setup-context/4` and returns `map: null`. No source is sent to a model and no provider/browser action starts. A `ready` Setup state means the selected configuration was saved, not that the application was tested or that an analysis provider is ready.

Use `loki_setup_resolve` with the exact expected source revision and optional target-profile revision. Its `loki.application-context/3` result has `map: null`, readiness state `configured`, `map: not-required` and `browserObserved: false`. Retain the original work item and configuration references. `authority: configuration-only` grants no browser, provider or source-transfer action.

A matching request recovers its original record across reconnect. Conflicting input under a requestKey refuses. Change the selected source or goal only as a separately authorized new configuration. Do not rewrite the old record.

## Continue the requested task

Use the installed `assess-change-risk`, `plan-tests`, `run-test`, `find-related-work`, `context-handoff` or evidence/report skills when they fit the user's request. They keep their own inputs, model/runtime requirements and action authority. Do not make Setup or a map a prerequisite for an otherwise complete independent request. Risk and planning can start from the original work item and attributed code context.

Do not call `loki_setup_handoff` as an automatic readiness gate. A missing consumer is explicit and does not block the independent capabilities. No simulated consumer acknowledgement may replace a real integration.

## Recovery and Stop

Use get or wait to read the original context. Fresh Setup has no map run to poll. If Stop returns `runId: null` and `cancellationRequested: false`, no operation cancellation was requested; do not call it a confirmed stopped run.

Historical mapping records remain retained. This release does not resume them or convert them into ready configurations. Preserve their actual state, result references and unknown effects. A finished wait or an interrupted chat does not prove that historical work stopped. Retry only known failed, stopped or blocked configuration work when its prerequisite changes or the user requests it.

## Finish in the same conversation

Confirm the actual saved configuration or concrete blocker in simple English. Do not narrate internal calls or progress. Continue the user's selected task when its real inputs and authority suffice. When the next action is open, follow the installed Setup skill's contextual native Question guidance. Missing provider configuration belongs beside the selected analysis or Runner action, not as a universal Setup gate.
