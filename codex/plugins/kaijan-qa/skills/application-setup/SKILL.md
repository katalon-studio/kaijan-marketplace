---
name: application-setup
description: Automatically prepare the selected application map during Setup, retain its source-bound context and wait for real readiness before dependent work.
---

# Prepare the selected application

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

This stage runs inside installed `setup`. Use the user's current goal and
supplied application/project context to propose the next concrete step. Do not
show a default capability menu or wait for a second create-map assignment. Ask
only for an actually missing application/input or an ambiguous selection. Reuse
already sufficient authority within its scope. Independent capabilities retain
their own prerequisites; map-dependent work waits for a real ready map.

Read the installed `loki-build.json` and actual Setup/capability readiness. Resolve
this profile's tools only. Setup tools are hosted on the same Local MCP server
as the capability tools; no separate Setup connection is required. An unavailable producer/provider/source-authority
adapter is an execution prerequisite, never permission to use a fixture, source
checkout or analysis CLI. Keep the original goal and collected inputs pending.

Before starting a map, check whether the installed reader already has a genuine
retained map for the selected repository and immutable revision. Read
[retained-map configuration](references/retained-map.md) when one is available.
That route reuses the real map and saves configuration through the existing
context APIs; it does not call the generation port or substitute a mock. Return
its verified configuration receipt in the same Setup conversation for completion
and next-action suggestions. A partial map keeps its partial status.

When no matching real map exists, use the installed `loki_setup_prepare` contract
with the selected source and `configuration.workItem`: the user's actual goal or
mapping question, retaining its original meaning. A request to prepare the
application for orientation is a mapping question; do not invent an issue, test
scenario or application-specific hints. If the goal is genuinely ambiguous, ask
only for that missing input. The normal Setup adapter calls the same admitted
public Node UI Modeler as `loki_ui_modeler_build_map`; there is no analysis CLI,
Research MCP or synthetic-success fallback.

Setup exports the frozen committed regular-file tree to private temporary input
and does not change the checkout or include dirty files. Unsupported committed
entries and source-size refusals stay explicit. Explain that committed excerpts
go to the configured provider within the tool's $10/5400-second limit. Codex's
selected approval policy governs the normal Setup tool call. Keep that mode:
under `never`, an already-authorized operation needs no extra source form;
interactive modes follow the host's actual confirmation behavior. Missing
provider or host-thread invocation context remains an actionable prerequisite.
Never switch to a fixture or collect provider keys.

The real producer returns a **source-inferred work-item fragment**. A settled
map with a processed page and no native stage failures can be `ready` for the
selected work item. Read
`map.data.readinessScope` and resolved `application.readiness.scope`: they retain
the original work item, incomplete application coverage and source-inferred
evidence with no browser observation. Setup also retains the exact mapId, native
answerId/result digest and original source/tree binding. An empty map or a map
without a processed page, or a map with native stage failures, stays `incomplete`;
unresolved provider accounting stays
`uncertain`. Read the exact map through the installed map API. Scoped readiness
does not prove complete application coverage or consumer acceptance. No complete
application consumer is currently admitted;
handoff must report that missing integration, not a synthetic acknowledgement.

For each new source operation, use the latest commit of the selected source.
Default initial mapping to `main`; honor a selected branch, PR head or exact
commit. Resolve a moving ref once to its immutable SHA. Never switch the user's
checkout, include dirty/untracked edits or claim a stale local ref is upstream
latest. Keep original run revisions during recovery; a new source selection is
a new operation. Use the observed target URL/environment when supplied. Ask for
missing target information only when the selected operation actually needs it.

## Run automatically when the inputs are sufficient

Keep the entire installed Setup lifecycle in the user's Setup conversation.
Local MCP state is scoped by the host's actual conversation identity: a native
subagent has a different scope, so its context IDs are not readable by the
parent. Do not delegate `loki_setup_*`, map creation or source consent to a child,
copy private state between scopes or override host metadata. Keep the original
goal and use the owning conversation for prepare, wait, get, Stop and recovery.
Independent onboarding steps may continue while the map runs; map-dependent
steps must wait for its original result. Do not invent optional setup work.

Keep user-facing map communication quiet. Do not send running/stage updates,
percentages or “still working” messages. Publish only the verified completion or
actionable blocker in English. While active, use bounded Setup waits without
ending the turn. Preserve original tool progress internally for diagnosis.

Read matching retained contexts with `loki_setup_list` for the selected directory.
Reuse only a ready map/context with the exact source and target configuration.
If several relevant contexts remain, ask one native Question among those actual
candidates. Use `loki_setup_prepare` for a new configuration with one stable
requestKey. Preserve returned applicationId/contextId, selected revision and
original map operation. Use bounded `loki_setup_wait` while active, then read
actual state with `loki_setup_get`; a tool receipt
that merely records selection is not proof that source analysis began.

All eight Setup tools advertise versioned input/output schemas. Inspect MCP
`isError` first and consume `structuredContent` using that tool's schema. An
execution failure is `{error:{code,message}}`; retain its safe recovery message
and original IDs. Invalid arguments remain MCP protocol errors. Never parse
display/progress text to determine readiness or replace a failed read with an
empty success. The JSON text fallback, when needed, is the same canonical value.
`loki_setup_prepare` and retry return the original handle plus current `state`,
`missing`, `nextAction` and `provenance`. Present blocked prerequisites and the
next action immediately; do not announce readiness from receipt recovery. These
summaries validate the original source/adapter binding without starting a new
operation. Get/wait return the
original `loki.setup-context/3`; inspect `state`, `missing`, `map`, `error` and
provenance. Resolve returns `loki.application-context/2` only when ready. Check its optional
`readiness.scope` before describing what is prepared; a work-item scope permits
bounded source-map/context reads and has incomplete application coverage. Handoff
can retain `consumer.state:pending`; that is not consumer acceptance.

Wait accepts optional `timeoutMs` from 1 to 30000 (default 30000). A deadline
returns retained state and cancels only the wait. It does not stop or restart the
producer or establish readiness. Native interruption requests Stop on this exact
map; read its actual state to distinguish `stop-requested` from `stopped`. A Stop
receipt's `cancellationRequested` records the request, not confirmed completion.
When it is false and `runId` is null, no cancellation was requested because there
is no map run; it does not mean work stopped. Show the receipt's `nextAction` and
actual retained `state`. Invalid-input protocol errors name the fields to supply
in their safe message and `data.fields`; use those fields for the corrective
prompt, without repeating the host's protocol-error prefix.

Workflow choice is separate from admission of a source operation. Setup retains
`host-managed-tool-dispatch`, bound to the actual host-thread scope, SDK request,
tool arguments and frozen configuration. This records the admitted operation,
not a host-confirmed form or knowledge of the raw approval mode. Core OAuth,
model-supplied mode/allow flags and unanswered workflow cards cannot supply it.
Keep genuine decline, cancel and Stop authoritative. Do not change approval
mode, fabricate a form answer or reinterpret an old failed receipt. Retry a
known blocked context only after the user requests it or its actual prerequisite
changes; preserve the old context and record the new binding.

Once actual prerequisites and authority are sufficient, automatically start or
reuse the selected map through the installed API. No second create-map prompt is
needed. Retain actual running/ready/failed/stopped/uncertain state in receipts.
Do not announce map admission, stage changes or elapsed time in the conversation. A
terminal failure, missing prerequisite or uncertain result can block dependent
work: report that actual condition once with the next supported recovery action.

## Finish, stop and recover

Verify the original result's application, immutable source, context/run ID and
terminal state before presenting the map and the context-appropriate next step
in one concise completion in the same Setup chat. A settled request is not proof
of a successful map. Empty, unprocessed or failed producer output stays incomplete or failed
and cannot grant readiness. A ready work-item fragment keeps its explicit
coverage limits and does not prove full application readiness. Source-derived map
claims are not observed browser
behavior. Native OS alert delivery is a separate host verification.

On the user's Stop, call `loki_setup_stop` for this exact context and wait for its
actual map/worker receipt. An interrupted chat alone does not establish that the
producer stopped. Preserve a pending cancellation or unknown effects as such.
A late result cannot reopen stopped work or select a newer run.

Reuse original request keys and read retained state after uncertain replies or
reconnect. Never recreate unknown work, silently retry provider effects, choose
a new revision for an existing run or mark a context ready from narrative text.
Retry only when requested or when the user has actually supplied the missing
prerequisite for that same pending goal. Preserve earlier failure/Stop evidence.

When the actual map is ready, resolve its supported application context with the
exact returned source/profile revisions. Hand it to a supported consumer only;
an unavailable consumer is explicit. Do not restart the full questionnaire or
require map preparation for an unrelated independent capability.
