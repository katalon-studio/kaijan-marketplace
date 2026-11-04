---
name: plan-tests
description: Propose baseline acceptance and risk-focused tests for a supplied issue or work item, optionally with attributed context or findings. Use before a PR exists or for source-backed planning; not test execution or an observed pass.
---

# Propose tests from current work

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

1. Use the caller-authorized original work item. An issue is enough: no PR, diff,
   application map or fabricated file/revision is required. Use Context Finder
   only when related work would help; use Risk Finder when uncertainty needs
   analysis. Neither is a mandatory predecessor. Keep their model-authored
   findings attributed rather than promoting them into accepted requirements.
2. Check `loki_capabilities_list` for Test Planning readiness. Call
   `loki_test_plan` with `input` containing the
   original `title`, `body` and a nonempty string `url` source identity. For a
   local work item, use the actual existing source-file URI and pointer; do not
   supply null, invent an external link or claim that an absent URI was known.
   For a chat-only request without a source URI, retain the complete original
   request through `context-handoff` and use the actual returned `sourceUri`.
   It names the retained copy; original source metadata remains unknown.
   Preserve supplied capture/revision/author
   claims when present; missing provenance stays missing. Do not fetch links or
   invent source merely to fill fields. The producer supports an explicit
   `pr-context-plan/3` packet for optional implementation, context or findings:
   retain each original source identity/text and its intent/implementation/context
   role. A finding is context, not intent authority. Use that producer contract
   without rewriting its algorithms or adding a map requirement.
   Choose one input form; do not mix them. For the simple work-item form,
   extract the complete original title/body and actual source URI from any caller
   wrapper. Optional original `updated_at`/`revision`, `author`/`user` and
   `captured_at` claims may accompany them. Do not append a wrapper's `sources`
   or `version`: those keys select the explicit versioned-packet contract, which
   requires its complete native structure. Preserve other original context in a
   retained record instead of constructing a hybrid packet. For example:

   ```js
   const input = {
     title: originalTitle,
     body: originalBody,
     url: actualSourceUri,
     // Include original provenance claims only when supplied:
     ...(originalRevision ? { updated_at: originalRevision } : {}),
     ...(originalAuthor ? { author: originalAuthor } : {}),
     ...(originalCaptureTime ? { captured_at: originalCaptureTime } : {}),
   };
   ```

When useful Kaijan risk answers already exist in this conversation, pass
`riskAnswers: [{family: "changeRisk", answerId, resultSha256}]` (or family
`riskFinder`) alongside either input form or `contextId`. Use exact saved
IDs; the hash is optional. Kaijan reads the complete original answer and
adds it as context. Do not copy its findings or run risk analysis again.
Keep the original work item: risk findings do not replace baseline tests.
A missing or changed reference must be corrected before planning starts.

3. A retained record can supply `nativeInputs.testPlanning` with the exact
   supported `{input, riskAnswers?, options?}` object, without a requestKey. Submit it through
   `loki_context_submit`, then call planning with `contextId`. Raw reports and
   unresolved artifact references remain retained evidence; they are not parsed
   or silently converted into planning inputs.
4. Read the original native answer returned by `loki_test_plan`. Distinguish proposed baseline checks, risk-focused checks,
   requirement-backed expectations, hypotheses, missing oracles and execution
   gaps. Structural validity is not semantic completeness or a test pass. A
   completed query can contain an original producer failure; report that
   failure and partial/unknown accounting rather than an empty successful plan.
5. Optional `options.deadline_ms` controls the total provider deadline. A lost
   reply may use its original optional correlation key and input. Keep the original uncertain receipt separate from any new read-only attempt. Cancel the host request for user Stop; preserve actual known/unknown charges.

Planning runs the maintained Node producer API with Luna medium. It does not execute
steps, mutate a target, prove runtime readiness
or create permission for browser/test actions. Keep execution evidence separate.

## Preserve a baseline while adding tests

Use explicit experimental `loki_test_supplement` when an original valid plan
already exists. Supply `input.version: test-plan-supplement-input/1`, original
`context`, `baseline: {text, uri, revision, plan_path?}` and `risks` records
`{id, text, uri, revision, attribution}` (an empty array is valid). `text` is the
complete exact original baseline JSON; the native API can use an explicit
string-key `plan_path` for caller wrappers. Do not parse free prose into invented
test IDs or fabricate a baseline. Keep full task/human-conversation testing
context attributed in the original context packet. The native producer validates
its source references against that context before dispatch.

Read the result returned by `loki_test_supplement` and retain the unchanged baseline beside proposed
additions, baseline concerns and unanswered questions. An addition never silently
removes or edits an original test. Empty additions do not approve the baseline.
Resolve conflicting or missing oracles visibly. Host request cancellation propagates to the native call.
Saved input uses `nativeInputs.testSupplement: {input, options?}`.

The agent decides which concerns can be expressed as web UI tests and what needs
other inspection. Execute only within the user's authorized target, actions and environment.
The original request can already authorize the full Plan → Run → Assessment →
Report flow; continue it when inputs suffice, without another phase approval.
A Plan-only request never executes, and planning itself grants no new permission. Return actual
outcomes and supporting observations through the supplied-evidence assessment
skill; do not report merely proposed steps as execution. Explicit browser execution uses the separate test-execution skill with full scenario,
params and target authority. Planning never dispatches it. Broader memory ingestion
is not implemented.

Present the original query result with its source and accounting limits. After
the requested plan completes, use `review-report` with its actual completed
`answerId`, `resultSha256` and original work-item title to show the Test plan.
This is a read-only presentation, including for small answers; it is not another
planning request or permission to execute. Optional
`resultRead` supplies continuation metadata only. Never manufacture a legacy runId
from an answer or start another query merely to open its UI.

The advisory tool returns the full original native answer in the awaited call. There is no public advisory job, poll or Stop API. Cancel the host tool request to propagate cancellation; in-flight computation or fees can remain uncertain. Optional `requestKey` correlates identical input/configuration after a lost reply. Omit requestKey for ordinary new analysis, or use a fresh UUID. Reuse a key only for its original input/configuration. On request_key_conflict, the rejected call did not dispatch; use the supplied fresh key for new work.

A provider refusal, empty output or native failure does not trigger an automatic retry or a method/model change. An offered `query.recovery.action: new_analysis_if_needed` describes a separate read-only analysis, not recovery of the old computation. Use its fresh requestKey only when the current caller authorization covers that distinct analysis; preserve the original answer, failure and known/unknown accounting, and explain that another charge is possible. Without such recovery, do not infer retry permission from a fresh key; report the failure and its missing input/setup or other next prerequisite. Lost replies, in-flight work and `state:unknown` are not this case: recover the original with its key/input/configuration or the completed-answer reader; never use a fresh key to escape that fence. Honor user Stop; start no further analysis unless the caller later authorizes it.

Browser/desktop execution has a separate no-replay boundary. Immutable supplied-input answers may reuse a private cache bound to the complete input, selected package, model/settings and private configuration; a reused native ledger describes the original computation, not a new charge. When `resultRead` is present and the host presentation is truncated, call `loki_advisory_result_read` with its family, answerId and ordered offsets. Join `resultChunk.text` until nextOffset is null; this reads completed JSON without inference.

Validate the advertised input/output contracts and inspect MCP `isError` before consuming `structuredContent`. A tool execution error carries `error.code`, safe message and any declared recovery; an invalid-argument protocol error is separate. Preserve the original error and never substitute empty successful data. Use the identical serialized JSON TextContent only as a transport fallback, without parsing display prose. `state:complete` identifies a retained original answer, not native success or a behavioral verdict. Keep `answerId`, `resultSha256`, query reuse and all known/unknown accounting. `unknown`, `refused`, `cancelled` and `unsupported-consumption` need their explicit reason/retention fields; unknown effects never authorize replay.

For Plan, inspect `result.plan`, `result.checks.status`/coverage, and `result.receipt`, or the original `loki.planning-failure/1` receipt. For Supplement, preserve `result.baseline`, `result.supplement`, checks and receipt, or `loki.supplement-failure/1`. `executed:false` remains authoritative; a structurally valid partial proposal is not an observed pass.

For `unsupported-consumption`, preserve `contextId` and `detail`, read `loki_context_get`, and inspect `consumption.testPlanning` or `consumption.testSupplement`. If the exact supported input is available, pass it directly or submit a new Context record with `nativeInputs.testPlanning: {input, options?}` or `nativeInputs.testSupplement: {input, options?}`, without requestKey. For a correction use a new submission key and `supersedes`, preserving the old context ID. Otherwise identify the missing original work item, valid baseline or other required fields. Raw reports do not become planning packets, and a missing baseline must not be invented.
