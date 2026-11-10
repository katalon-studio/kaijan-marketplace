---
name: test-evidence
description: Assess caller-supplied test outcomes and observations against original work-item requirements, with an optional proposed plan. Use after authorized agent execution or for supplied evidence review; not test execution, artifact retrieval or automatic acceptance.
---

# Assess returned test evidence

1. Retain the original work item, human-conversation testing context, supplied
   requirements and any proposed tests. Preserve each source's attribution and
   unknown metadata. No PR, diff or code revision is required. If no proposal was
   supplied, keep `proposed_tests: null`; do not invent test IDs or a fake plan.
2. Inspect `loki_capabilities_list`, then call experimental
   `loki_test_evidence_assess` with `input.schema` equal to
   `work-verifier/supplied-test-evidence/1`. Supply `work_item` with original
   `{title, body, provenance}`, `requirements` and `proposed_tests` as null or
   original `{id, text, provenance}` records; `outcomes` as
   `{id, test_id, status, text, evidence_ids, provenance}`; and `evidence` as
   `{id, text, bytes_base64, reference, provenance}`. Use explicit null for absent
   text/bytes/reference, test_id, target or provenance. Preserve status labels
   such as pass, fail, skipped, blocked or not-run exactly. Keep known target,
   revision, environment and time as caller assertions, never manufactured facts.
3. Include actual authorized observations, logs or bytes already available.
   References remain unresolved; this tool does not fetch files, links, screenshots
   or artifacts. Non-text bytes remain opaque. Keep original report blocks rather
   than rewriting them as an all-green summary. Supplied report labels do not
   demonstrate behavior on their own. Do not impose a blanket authentication,
   screenshot or byte requirement on useful scoped text observations.
4. Read the original result returned by `loki_test_evidence_assess`.
   Preserve positive scoped support, partial support, contradictions, unexercised
   behavior, blocked work, scope mismatches, unresolved evidence and open oracles.
   Findings link exact source spans; literal binding and record membership do not
   prove semantic truth, authenticated execution or complete acceptance. Original
   partial/error responses and unknown fees stay visible. Synthetic producer
   controls do not establish customer utility or calibrated favorable credit.
5. Retention can use `nativeInputs.suppliedEvidence: {input, options?}` through
   context submit followed by contextId. Raw retained prose is never automatically
   converted. The operation requests one Luna-low call with an absolute deadline
   at most180000ms and no retries. Use the original optional correlation key/input after a lost reply. Cancel the host request for user Stop; preserve actual accounting and retain original uncertain receipts.

The agent owns execution decisions within its separate user authorization and
returns actual outcomes. This assessment never executes tests, grants target
permission, calls Test Runner, ingests shared memory or automatically accepts work.

The advisory tool returns the full original native answer in the awaited call. There is no public advisory job, poll or Stop API. Cancel the host tool request to propagate cancellation; in-flight computation or fees can remain uncertain. Optional `requestKey` correlates identical input/configuration after a lost reply. Omit requestKey for ordinary new analysis, or use a fresh UUID. Reuse a key only for its original input/configuration. On request_key_conflict, the rejected call did not dispatch; use the supplied fresh key for new work.

A provider refusal, empty output or native failure does not trigger an automatic retry or a method/model change. An offered `query.recovery.action: new_analysis_if_needed` describes a separate read-only analysis, not recovery of the old computation. Use its fresh requestKey only when the current caller authorization covers that distinct analysis; preserve the original answer, failure and known/unknown accounting, and explain that another charge is possible. Without such recovery, do not infer retry permission from a fresh key; report the failure and its missing input/setup or other next prerequisite. Lost replies, in-flight work and `state:unknown` are not this case: recover the original with its key/input/configuration or the completed-answer reader; never use a fresh key to escape that fence. Honor user Stop; start no further analysis unless the caller later authorizes it.

Browser/desktop execution has a separate no-replay boundary. Immutable supplied-input answers may reuse a private cache bound to the complete input, selected package, model/settings and private configuration; a reused native ledger describes the original computation, not a new charge. When `resultRead` is present and the host presentation is truncated, call `loki_advisory_result_read` with its family, answerId and ordered offsets. Join `resultChunk.text` until nextOffset is null; this reads completed JSON without inference.

Validate the advertised input/output contracts and inspect MCP `isError` before consuming `structuredContent`. A tool execution error carries `error.code`, safe message and any declared recovery; an invalid-argument protocol error is separate. Preserve the original error and never substitute empty successful data. Use the identical serialized JSON TextContent only as a transport fallback, without parsing display prose. `state:complete` identifies a retained original answer, not native success or a behavioral verdict. Keep `answerId`, `resultSha256`, query reuse and all known/unknown accounting. `unknown`, `refused`, `cancelled` and `unsupported-consumption` need their explicit reason/retention fields; unknown effects never authorize replay.

Read `result.status`, `result.assessment.validation_status`, literal findings/bindings, `native_receipt`, `failure`, persistence and continuation flags. A null assessment or `first_response_failure` is not a successful empty assessment. `execution_authenticated:false` and `acceptance_decision:null` remain unchanged.

For `unsupported-consumption`, preserve `contextId` and `detail`, read `loki_context_get`, and inspect `consumption.suppliedEvidence`. If the exact supported supplied-evidence input is available, pass it directly or submit a new Context record with `nativeInputs.suppliedEvidence: {input, options?}`, without requestKey. Use a new submission key and `supersedes` for a correction, preserving the old context ID. Otherwise state the missing source/outcome fields; do not turn raw reports into authenticated execution, fabricate tests or dereference unresolved artifacts.
