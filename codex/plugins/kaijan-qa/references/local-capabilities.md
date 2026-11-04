# Local Product MCP capabilities

## Chat updates

Keep routine Kaijan activity out of assistant chat. Do not narrate tool calls,
planning, execution, polling, internal phases or elapsed time. Show useful findings
and results, partial or failed evidence, and blockers that need action. Keep
required confirmations, real missing-input questions, the Setup welcome and
answers to user status questions. Report material failures. Ground each result
claim in the returned evidence. Keep partial, failed and unknown outcomes explicit;
a finished call does not prove a pass.

This rule applies to host assistant messages. It does not change Runner traces or
evidence, provider reasoning, or host tool indicators. Do not claim this guidance
hides those indicators.

## Presentation

Use ASD-STE100 Simplified Technical English for host narration and final prose.
Use the host's final rendering as a plain English presentation pass: short active
sentences and familiar words. Do not reduce analysis quality. Keep original
structured analysis, evidence and verdicts intact. Preserve facts, numbers, names,
conditions, uncertainty, missing evidence and exact artifact IDs where useful. Do
not translate technical identifiers, omit a material limitation, or change an
unverified or inconclusive result to passed. Do not make a separate provider call
for each internal step. This guidance does not rewrite raw engine outputs or
native panel text.

Lead with concrete observations and the specific checks still missing. Use:

- **Test finished** when execution completed without a supported pass/fail verdict.
- **Found a problem: <observed contradiction>** only when evidence supports it.
- **Could not finish: <reason>** when execution is incomplete.
- **Could not check <specific condition>** when the required evidence is missing.

Do not use raw Unverified or inconclusive badges, or a stock authentication
statement, as the main user status. Keep technical native statuses in records. A
user-facing pass or fail still needs sufficient evidence; do not invent a verdict.

Report tools expose their MCP Apps UI by default. The library option
`createCapabilityCatalog(services, { uiEnabled: false })` explicitly selects
chat-only output: no UI metadata, resources or local previews are exposed in
that mode. Present returned chat results with concise prose, Markdown tables or
Mermaid diagrams grounded in the data. Follow each tool's advertised description
and returned presentation. Other capabilities continue to return their original
results in chat. Read relevant results, keep unresolved facts clear and link
useful evidence. Open external Playwright replay only when requested.

Codex calls the installed Product MCP tools directly. No analysis CLI is part of this integration. Inspect loki_capabilities_list for actual readiness. The fixed Product profile binds private state and the Core HTTP/OAuth connection; source, provider, GitHub and browser authority remain distinct.

The local catalog includes Context Intake, related work (generic names and explicit PR aliases), code and work-item risk, test planning, immutable supplements, supplied-evidence assessment, native browser execution. Application maps are not offered or required in this dogfooding plugin release. Setup saves source/goal/optional-target configuration without sending source to a model. An issue is enough for work-item risk and planning. Planning never starts Runner automatically. Pass the full scenario, explicit friendly params and initial URL when authorized. IDs correlate only.

Use the installed owning skill and exact advertised input schema. The advisory tool returns the full original native answer in the awaited call. There is no public advisory job, poll or Stop API. Cancel the host tool request to propagate cancellation; in-flight computation or fees can remain uncertain. Optional `requestKey` correlates identical input/configuration after a lost reply. Preserve unknown effects and never replace them under a new key. Immutable supplied-input answers may reuse a private cache bound to the complete input, selected package, model/settings and private configuration; a reused native ledger describes the original computation, not a new charge. When `resultRead` is present and the host presentation is truncated, call `loki_advisory_result_read` with its family, answerId and ordered offsets. Join `resultChunk.text` until nextOffset is null; this reads completed JSON without inference. Runner retains its separate execute/get/stop lifecycle. References remain unresolved unless a separately authorized capability retrieves them.

The supplied native algorithms, prompts, models and validator contracts retain their origin hashes. Current public sources live under packages/. Alternative experiments remain in experiments/ and are outside the Product build selection. Mapping source is preserved in the repository for future backend work; it is not an installed plugin action. Broader cleanup remains deferred. Research MCP registration/distribution is removed; there is one maintained Product capability MCP plus the existing Product Setup and Core transports.

This package includes no application map, test-case dataset, prepared answer, credential or browser binary. Native Runner downloads compatible Chromium on first use through its pinned Playwright installer and reuses the versioned user cache. Import, discovery and analysis do not download browsers. If preparation fails or provider configuration is unavailable, report readiness honestly. Do not switch to an old experiment or a CLI bridge.

The normal Local stdio declaration forwards only the approved existing provider
environment names: LOKI_OPENROUTER_API_KEY, LOKI_OPENROUTER_BASE_URL and
LOKI_MODEL_PROVIDER, plus the existing optional routing names
LOKI_LITELLM_ENABLED and LOKI_LITELLM_ORIGIN. This preserves an explicit
private-gateway choice or disable flag instead of silently selecting a different
transport. Credential values remain in the caller environment; they
are not packaged, logged or saved by this declaration. A missing provider remains
an execution prerequisite. This does not adopt a shared provider profile or
forward the entire environment.

## Compose a caller-scoped test request

Use the installed `test-request` skill for a full testing request. The coding agent
selects analysis and planning under the original goal, target and actions.
Use `loki_test_execute` for normal execution and assessment. Kaijan reuses its
saved task, selected tests and evidence internally, then saves the combined report.
Use `loki_test_get` for that same flow and `loki_test_stop` for Stop. The caller
does not copy saved evidence back or invoke a second routine assessment. Independent
execution and external-evidence review remain available. Plan-only
requests do not execute. Full requests with sufficient inputs continue through
their selected scenarios, evidence assessment and native report.

Context Intake submit/get returns `sourceUri` for its exact retained record:
`urn:kaijan:retained-context:<recordSha256>`. Use that actual identity when a
chat-only request lacks an original source URI. It is not an external source,
public URL, access grant or artifact resolver. Preserve original provenance and
use the same conversation-scoped contextId/get for reads. Keep exact completed
Plan/Assessment answer IDs/digests, actual Runner IDs/digests and selected test
references through the flow. Mixed reports use `view: "test-plan"` with all
selected original operations. Reopen the immutable reportId without producers.

## Read Runner readiness without execution

`loki_capabilities_list.computerRunner` uses `loki.computer-runner-readiness/1`.
`state=blocked` distinguishes `configuration.state=missing` from `invalid`;
`state=configured` means effective prerequisites were parsed, not validated.
Implementation pins identify packaged native bytes when available; absent pins are
unknown. Provider transport, fixed Luna/low model, credential presence and unknown
validation are separate. Managed-broker upstream identity and credentials remain
unknown until supported execution provides evidence. Browser availability, target
access and desktop permissions are not checked by discovery. No model request,
browser action or download occurs.

Installed discovery also returns `runtime`: the responding plugin version/build,
source revision/dirty flag, verified-at-startup capability digest, installation,
connection and scope identities, and process version/platform. These describe the
loaded process, not the current checkout. Changed fixed installation metadata is
reported as stale; missing/unreadable metadata is unknown. A match does not prove
host selection, latest version or continued payload integrity. Compare to the exact
artifact selected for the task. The host exposes no universal current-package check.

Repair missing/invalid fields using the approved host environment or the existing
private Product profile mechanism; never put credentials in chat, logs or arguments.
Inherited allowed fields override saved fields; an unsafe/malformed profile is
ignored without exposing its contents, with that diagnostic retained. Local direct
Runner uses OpenAI; QA shared authentication uses its existing broker transport.
Neither route is changed by discovery and Core login is not a local Runner prerequisite.

Retain the first blocked/stale receipt. For host environment changes use supported
host reconnect after reading/reconciling admitted runs. Preserve the host-thread
scope and original run references; a connection-only fallback cannot reconnect its
state across restart. Do not terminate or replay unknown effects to refresh a tool.
After repair/reconnect, inspect the actual responder and complete the same authorized
goal. Retain original results/readback as execution evidence; discovery itself never
establishes credential validity, successful behavior or persistence.
