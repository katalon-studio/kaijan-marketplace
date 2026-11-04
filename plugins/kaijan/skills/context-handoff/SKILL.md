---
name: context-handoff
description: Retain relevant work-item, change or test-report context already available during an authorized Kaijan task, and reference compatible saved input in Kaijan analysis. Use for context handoff or missing-input follow-up; not workspace collection, test execution or external publication.
---

# Hand context to Kaijan

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

Use this when the current task asks Kaijan for context/risks, an implementation or
test has produced relevant context worth retaining, or a Kaijan reply requests
missing input. Submit only authorized task-relevant material already available.
Do not scan unrelated files or run another model/browser task to fill a template.
If a direct analysis input already fits and retention is unnecessary, use the
analysis tool directly.

Inspect `loki_capabilities_list` as `loki.capability-discovery/1`. Use typed
per-service state fields: package readiness, provider configuration, provider
validation, map selection and Context input compatibility are separate. Matching
runtime metadata does not prove freshness or payload validity. Call `loki_context_submit` with one requestKey,
a descriptive kind and original content as raw text or JSON. Partial context is
valid. Include known subject, origin/author, revision, environment or artifact
references; omit unknown metadata or retain explicit null. Never invent source
capture time or revision. Receiver time is separate. Keep agent interpretation
attributed and distinct from original tool output. Do not include credentials.

Artifact references are stored unresolved without reading, fetching or parsing.
A supplied test report is reported evidence, not Kaijan execution or an independently
verified pass. Consume `structuredContent` under the advertised output schema. Submit success is
`loki.context-receipt/1`; get success is `loki.context-read/1`. Inspect `isError`
and safe `error.code/message` before using a success. Never infer state, IDs or
readiness from labels, prose or the JSON text fallback. The receipt's `state`
means storage only. Read each `consumption.<capability>.state` before claiming
input compatibility; `analysisReadiness` remains `not-established`.
For a large read, follow `recordRead.nextOffset` then `recordChunk.nextOffset`
until null, joining only chunk text in order. These UTF-16 offsets reconstruct
original JSON transport; they do not parse presentation or imply analysis.
Use `loki_context_get` and its offsets for the immutable original when needed.
The returned `sourceUri` identifies that exact retained record. When a chat-only
request lacks an original source URI, this actual retained identity can source a
planning input. It is not an external ticket, an observed origin, a public link
or an access grant; preserve unknown original provenance.
Retry identical submissions with the same key. For updates use a new key and
supersedes; retain the earlier context ID.

On execution failure use `error.code` and safe `recovery.action/instruction`, not
parsed prose. `context_not_found_in_scope` covers missing and other-scope records
equally: return to the original receipt and conversation, without inferring
another scope's data. Preserve the original on `context_request_key_conflict`;
use a new key only for a distinct authorized update. `context_invalid_offset`
requires returned cursors. For `context_integrity_failed`, keep the existing
record and resolve integrity with its owner; do not overwrite or replay.

For example, save a partially investigated requirement as kind `work-item` with
its original text, or save a test report as kind `test-report` with the original
result and log references. Both can be retained without a complete source packet.

When an exact supported analysis input is already available, include it under
`nativeInputs.prContext`, `nativeInputs.changeRisk`, `nativeInputs.riskFinder` or
`nativeInputs.testPlanning`, using that tool's advertised
input without a requestKey. Follow [related work](../find-related-work/SKILL.md) or
[change risk](../assess-change-risk/SKILL.md), or [test planning](../plan-tests/SKILL.md) for the owning contract. Then pass
the returned contextId and optional correlation requestKey to the advisory query
tool. Explicit analysis options override saved options. Keep that same contextId,
key and options after a lost reply. Do not convert prose, logs or test summaries
into a frozen code packet. Incompatible context stays retained. Explain the
missing input and useful recovery without fabricating fields; keep the exact
unsupported-consumption receipt for explicit diagnostics. Follow the shared
presentation rule for normal replies.

For work-item uncertainty, `nativeInputs.riskFinder` contains `{packet}` under
its maintained work-item contract; it does not require frozen code or a map.
For `unsupported-consumption`, preserve `contextId` and `detail`. Read
`loki_context_get` and the relevant `consumption` entry. If the required original
source fields are available, assemble the owning tool's advertised input with
those fields and their provenance. Pass it directly or submit a new Context
record with its `nativeInputs` field, a new submission key and `supersedes`.
Keep the earlier context ID. Otherwise identify the missing fields; do not
fabricate packet fields, turn raw reports into code evidence or fetch unresolved
references automatically.

Explicit experimental consumers also include `nativeInputs.testSupplement` and
`nativeInputs.suppliedEvidence`, each containing the exact `{input, options?}`
object without requestKey. Intake runs the maintained offline producer preparation;
compatibility still does not prove semantic validity or an observed pass. Follow
[test planning](../plan-tests/SKILL.md) for immutable supplements and
[test evidence](../assess-test-evidence/SKILL.md) for returned observations. Original
conversation/task context remains attributed, and references remain unresolved.

Advisory consumers return their native answer in the same awaited call. Use the completed-answer reader only if the host truncates presentation; cancel the host request for user Stop. Context submit remains an explicit persistent write.
