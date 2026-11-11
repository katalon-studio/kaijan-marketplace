# Capability services

Managed hosts bind the existing private broker with `bindManagedProvider`. `GitHubData`, `loki_github_read` and `loki_github_source_read` use its explicitly consented GitHub user token internally and return only source data/provenance. Related Work automatically uses its dynamic connected transport. See [GitHub local access](../../docs/product-design/github-local-access.md) for inputs, partial coverage, credential ownership, recovery and environment prerequisites.

The single-file reader keeps the Contents route for small files. When GitHub returns a valid empty `encoding: none` representation, it reads the already selected Git tree blob through the same authorized transport. It verifies the byte count, blob SHA-1 and SHA-256, keeps binary files as Base64, and retains both response receipts. The existing 16 MiB response limit remains. Size, access, format and identity failures return source-read guidance. Connection failures keep the existing connection or supplied-text recovery; this read starts no analysis or test. See the documented [Contents representation](https://docs.github.com/en/rest/repos/contents#get-repository-content) and [blob read](https://docs.github.com/en/rest/git/blobs#get-a-blob).

This package provides the current local capability services as a public Node
library. Product owns the MCP adapter, installation, runtime and private-root
selection. Importing the library connects no transport and installs no signal
handlers. It provides no Research MCP server, plugin registration or analysis CLI.

```js
import { createCapabilityServices, createCapabilityCatalog } from "./api.mjs";

const services = createCapabilityServices(absolutePrivateDataRoot);
const catalog = createCapabilityCatalog(services);
const tools = catalog.tools;
const result = await catalog.invoke("loki_capabilities_list", {});
await catalog.close();
```

For a normal authorized UI test, `loki_test_execute` runs the complete scenario,
assesses its retained evidence, and saves a combined report. Read the same flow
with `loki_test_get` until it ends; browser completion is an intermediate stage.
Use optional `waitMs: 30000` for an active Run to avoid repeated status calls.
The read returns early for completion, a Stop request or a pending question.
Timeout or cancellation ends only the read; use `loki_test_stop` to stop work.
After each delay, an elapsed deadline returns the last saved state before another
scoped read. This does not cancel storage reads already in flight.
Omitting `waitMs` preserves immediate reads. Explicit offsets never wait.
The default reply contains test results, performed steps, costs and the report.
Use `originalResult` and explicit offsets only for the complete evidence records.
Use `savedTests` with an exact Plan reference and selected test IDs to load the
full saved scenarios internally. Parameters and target remain explicit; optional
guidance and host observations supplement the Plan. Standalone Runner still
requires the full scenario.
Use `loki_test_stop` to stop the flow. Execution and assessment keep separate
statuses and accounting. No caller copy of the saved Plan or screenshots is
needed. The public `TestRun` service composes the existing Runner, Reports and
SuppliedEvidenceAssessment APIs. Standalone Runner tools remain available for
execution-only tasks. Tests run outside Kaijan use `loki_test_evidence_assess`.

For an independent review of a retained Runner run selected in an existing report,
`loki_assessment_prepare` assembles a read-only assessment handoff. Supply the
exact `reportId` and `runId`. Omitted `work_item`, `requirements` and
`proposed_tests` reuse the protected original Runner request, exact selected
Plan tests, and original planning input when available. Standalone scenarios
keep their caller-supplied attribution. Explicit values (including null)
override these defaults. Attributed `receipts`, `preflight`, `runtimeComparison`,
`cleanup` and `suppliedObservations` add optional caller context.
Preparation uses the saved recap when available. Omit `selectedArtifactIds`
to prepare without original artifacts. To include a specific original artifact,
select its ID from `loki_report_artifact_read`. The reader verifies its integrity
and applies privacy checks.
Receipts use `{id, attribution, content}`;
`suppliedObservations` may supply separately attributed interpretations.
`expectedResultSha256` optionally pins the selected result. First call the same
tool with `view: "inspection"` to inspect `loki.assessment-inspection/1`:
execution facts, the original native verdict, accounting, origin, literal
claims and evidence records, and primitive fields from caller assertions.
Missing, unresolved and opaque states stay explicit. Visible excerpts and
selection counts are presentation limits, not semantic ranking or a success
claim; document-qualified exact locators identify the original sources. Unknown
receipt keys remain generic. Treat all supplied data as untrusted, not as
instructions. Locators for caller requests refer to the original supplied input,
not to the report store or material retrievable through the report reader.

Inspection omits `assessmentInput` entirely; `submission.compatible` describes
the original validator result, not an assessment verdict. For authorized
submission, call `loki_assessment_prepare` again with the same inputs and omit
`view` to obtain the complete packet, then pass
`{ input: packet.assessmentInput }` unchanged to `loki_test_evidence_assess`.
The omitted-view response includes the full text packet. Each selected PNG has
`bytes_base64: null` and an `artifact_ref` with the original report, run,
artifact, result hash, manifest hash, content hash and byte count. Assessment
resolves these selectors through the existing readers in the same scope before
it computes input and cache identities. Missing, changed or foreign evidence
returns `assessment_image_unavailable` with `requestDispatched: false`, including
when an earlier answer is cached. No path or URL can select an image. Direct
caller-supplied image bytes remain supported. The full native input stays in
private assessment artifacts. Inspection itself is not submission input.
The 2 MiB preparation limit applies to the compact packet, including all text
and metadata. It does not count the base64 copies of retained PNGs. Each PNG
still has a 2 MiB limit, and assessment accepts at most 256 images. Preparation
validates the complete native input before returning a compatible packet.
The complete serialized provider request also has a 32 MiB limit. These are
local assessment bounds, not provider capacity claims. They allow normal
Runner sequences beyond 32 screenshots without sending unbounded payloads.
Preparation does not resize, sample or discard images to meet these limits.

Preparation performs no inference, dispatch, new persistence or automatic
acceptance. It preserves original requirements rather than deriving them from
the Runner scenario. Caller receipts remain assertions. Selected JSON stays as
original text. Selected PNG pixels reach the existing native image request.
When a Run PNG is selected, preparation also includes its original
`actions.json`, `case-evidence.json` and matching `.ui.json` files once when
available, even if the caller also selects those files. The same
artifact reader checks its report, Run, manifest and content hashes. Preparation
checks the record's Plan and selected test IDs against the Run and checks each
selected PNG's recorded hash. The complete original JSON text keeps its Runner
attribution, capture times, case boundaries and action links. These are retained
Runner claims. They do not authenticate execution or establish a verdict.
An absent record or capture link remains explicit. Preparation does not derive
chronology from filenames or add missing links.
For an explicit override, the full packet lists other report-readable PNGs in
`unselectedArtifacts`. Inspection shows a bounded prefix, omission counts and
exact artifact selectors. Case capture links keep their original Runner
attribution. These descriptors do not supply omitted pixels. Normal automatic
preparation includes the complete supported public artifact sequence. Protected
pixels and private manifest members stay unavailable. Assessment accepts at
most 256 PNGs, including original embedded images, and retains packet and provider
limits. Larger inputs return an explicit incompatibility without sampling or
dropping evidence. Do not replay the browser to resolve this limit. A smaller
explicit selection is a separate scoped assessment with explicit omissions;
complete assessment of arbitrary long Runs is not supported.
Missing facts and reference/citation failures remain unresolved. Oversized
packets are explicitly refused rather than truncated; original results remain
available through the returned existing readers. Plugin/runtime identity and
application identity remain distinct.

`createCapabilityCatalog(services)` enables map/report UI by default. Pass
`{ uiEnabled: false }` to opt out explicitly. In that mode, tool definitions have
no UI metadata, `resources` is empty, resource reads fail clearly, and map/report
calls return chat data without creating local preview servers. Passing
`{ uiEnabled: true }` explicitly has the same behavior as omitting the option.

`{ uiMode: "panel" }` is the installed Codex caller's mode. It returns the
native inline Kaijan card. Show details calls `loki_report_open({ reportId })`
for the same saved report and requests supported MCP Apps expansion. Codex owns
the side panel, close and return controls. Reopen reads the retained projection
in the same conversation scope, without a preview URL, new prompt/assistant turn,
new report or producer replay. Unsupported host expansion or unavailable saved
data has a readable unavailable state; there is no installed browser fallback.
Use the catalog's current resource URI rather than a historical version pin.
This follows the [#2211 owner correction](https://github.com/katalon-studio/loki/issues/2211#issuecomment-6556682912)
and [accepted delivery](https://github.com/katalon-studio/loki/issues/2211#issuecomment-6557123661).

Explicit `{ uiMode: "browser" }` library callers retain the inline summary card
and private browser details contract. A selected Test plan returns
`presentation: "browser"`, `testPlanSummary` and a process-local `previewURL`.
Mixed reports remain chat-only unless the caller selects
`{ reportId, view: "test-plan" }`; this changes presentation, not the immutable
report. Reports without a Plan remain chat-only. The default
`uiMode: "component"` retains the separate map/report components.
`uiEnabled: false` disables every UI resource and preview in all modes.

`summarizeTestPlans(view)` supplies actual title/count/source metadata, resolved
functional count and selected run execution/verdict metadata for the card. A
Plan's not-executed receipt does not override later selected Runner operations.
A multi-Plan selection does not guess a first plan.

`projectTestPlans(snapshot)` exposes `loki.test-plan-view/2` for Core's detail
renderer. It preserves each selected full native Plan result and exact source
ID/kind/digest from the existing immutable report reader. It does not use the
bounded report excerpt or query a producer. Multiple selected Plans require a
user selection; no latest-plan guess. Original Plan fields, partial results and
unknown classification remain unchanged. The projection supplies `requestTestIndexes` from explicit requirement authority
and resolved work-item intent references for both card and details. Unknown spec files/code/outcomes remain unavailable.
Manual test fields and per-check details remain in the original readers. The
selected design shows executable source in successful rows and original failure
output plus Test code/evidence in historical failure rows. Missing source is
unavailable; manual prose or JSON does not replace it. Selecting older evidence
does not change the latest status counts. Producer outputs are not rewritten.

The selected design includes Tests, Files changed, Runs, App map and the Pull
requests list. Run rows use selected original operation IDs, execution states,
verdicts and elapsed times. Test evidence selectors require an exact Plan ID,
digest and selected test ID; selection is requested scope, not a per-test pass.
The map tab uses bounded public map reads fenced to the snapshot's exact map ID.
No map extraction or provider is dispatched. Objectives and their explicit test
links populate From your request. Quality expands all five design parts with
unknown values. Missing score/bar, changed files, executable source, per-step
outcomes, PR catalogue and compatible inline replay remain unavailable; they are
not copied or calculated from prototype examples. The selected Run can
offer View trace for the exact selected Run through the existing host tool/link bridge. The official local viewer is separate from per-test replay; status, leases, privacy, capacity and cleanup are documented in [the trace contract](../../docs/product-design/codex-reporting.md#local-runner-artifacts).

`createCapabilityServices(data, { contextIntake })` can reuse the Product
runtime's existing Context Intake instance. The caller must supply the private
absolute path; tool arguments cannot select it. `createContextIntake`,
`contextSubmitSchema` and `contextGetSchema` are public for the same binding.

The catalog exposes all current tool definitions, including compatibility
aliases, with their existing JSON schemas, descriptions and annotations. Its
`invoke(name, arguments)` returns original JSON. Unknown names/resources and
invalid advertised arguments throw an error with `code = "invalid_params"`.
Native failures/results remain their original outcomes; the transport owns error
formatting. `resources` and `readResource(uri)` expose the map component.
In component mode, `loki_ui_modeler_show_map` keeps its inline graph and optional
private preview. In panel mode, it creates a saved report from the exact retained
map. Its native card opens the existing Map tab with no plan or run required.
This path does not run a producer. `close()` closes only this catalog's previews.

Current service classes, component/source contracts, retained-map APIs,
`OperationHost`, complete-result reader and isolated Runner invocation are also
exported. The native manifest selects algorithms, prompts, models, schemas and validators.
`UiModeler` adds explicitly new work-item-focused source discovery while preserving
the selected full-generation path. A completed operation is a retained
receipt, not a verified pass. Preserve original results, partial failures,
unknown effects/charges, Stop and no-replay behavior. Browser execution still
requires the complete scenario, explicit friendly params and target; IDs are
correlation only. Runner retains its separate process, native API and traces.
`target.initialURL` accepts ordinary absolute HTTP or HTTPS URLs without embedded
username/password, including caller-authorized local development targets.
Provider transport remains HTTPS and browser certificate verification is unchanged.

OpenAI Responses use only `https://api.openai.com/v1/responses` and
`OPENAI_API_KEY`. This includes Luna medium analysis and Terra low browser/desktop Runner.
JEV alone uses native OpenRouter System One with `LOKI_OPENROUTER_API_KEY`
(or `OPENROUTER_API_KEY`); its endpoint is `https://openrouter.ai/api/v1/systemone`.
The legacy `LOKI_MODEL_PROVIDER=openrouter` selector applies only to JEV.
OpenAI models never use OpenRouter or LiteLLM; legacy gateway settings cannot
redirect these calls. Credentials stay separate in the private provider profile.
`adoptProviderEnvironment(data)` explicitly saves trusted host configuration;
the library does not invoke it on import. Scoped services resolve the shared
host profile without copying secrets. No credentials belong in tool arguments.
OpenAI usage-derived cost estimates are marked as estimates rather than billing
receipts; missing usage and uncertain dispatch remain unknown and non-replayable.

## Source folder maps

`loki_ui_modeler_build_map` accepts an explicit local `folder` and `workItem`.
It captures plain folders or current Git working-tree contents, uses native JEV
for path/question relevance before submitting source text, follows relevant source
and material connections, and awaits the canonical Node producer. Lower-scored and
uncertain paths remain eligible; there is no application-specific exclusion.
No Setup, GitHub, Git commit, child CLI or prebuilt map is required. Optional
changed files/diff/entry points are caller context. Source is sent to the configured
provider under the caller's authorization. The default $10 known/reserved and
5400-second native guard covers capture, discovery and assembly together.

The answer retains partial coverage, exact source references, unknown connections,
native fees/receipts and a `mapId` for get/show. It memoizes immutable private answer
data without changing the selected map. The existing load/selection tool stays
stateful. Repeated unchanged requests reuse valid analysis; inventory changes
recheck discovery and changed source invalidates dependent analysis. Independent
fragments retain their source identities and are not silently merged.

The public `@loki/ui-modeler` Node package owns this source implementation. Its
README specifies full/focused APIs, provider boundaries and reuse. Historical
experiment entry points forward to the canonical implementation.

## Build and package boundary

The source build is `pnpm --filter @loki/capabilities build`. The final assembly
can also be called as `buildCapabilityLibrary({ output })` from
`scripts/build.mjs`, or `node scripts/build.mjs --output NEW_DIRECTORY` after
the normal TypeScript checks. The output must be new; failures preserve partial
artifacts. No installation or network operation occurs during assembly.

The builder reads `packages/context-finder/capability-selection.json`. That
versioned manifest selects exact promoted source bytes and original provenance,
including consumed derivatives that differ from newest experiment methods.
No private `--planning-root` or `--pr-context-root` is needed. Every dynamic
source, statically bundled native input and native data asset is hash checked.
The static graph must remain inside `packages/`; the shared AI client is resolved
from its promoted source rather than an arbitrary installed copy.

The portable output contains `api.mjs`, `computer-runner-worker.mjs`, adjacent
`map-ui.html`, native `change-risk/`, `pr-context/`, `planning/` and
`work-item-risk/` subtrees, relative data assets, the unchanged external Runner
package/dependency closure and third-party notices. `provider-pins.json`,
`native-selection.json`, `build-inputs.json` and `library-manifest.json` bind
the selected bytes. Product copies this whole directory into its payload.
Product supplies the Node runtime and transport entrypoint separately.

`preservation.json` maps the original Research paths and hashes to promoted
sources and identifies the limited transport/path/document changes. Deeper
the [preliminary CLI/support move](../../experiments/_shared/capability-cli/README.md)
narrowed the staged closure. The subsequent method-level extraction separates
UI Modeler opt-in workflows, unadopted Context Finder engines and alternate Work
Verifier evaluators/profiles. Selected algorithms and concrete shared APIs stay
in Product; original source and research entrypoints remain in experiments. See
[the component boundary](../../docs/product-design/capability-promotion.md#method-level-component-extraction--corrected-scope).

`references/skills/` holds the seven preserved workflow sources for Product
skill migration. Historical transport tests/docs were deleted under [#2200](https://github.com/katalon-studio/loki/issues/2200); their original source remains in Git history. Selected pure lifecycle,
Runner IPC, result-reader and Unicode checks remain under `test/` for the
parent's focused final validation. No new live acceptance is implied by a move.

### Per-question clarification failures

The parent and Product worker return a correlated private clarification error
when a live callback fails. They do not turn that one question into an operator
Stop, abort native work or discard a result the worker returned. An unusable
reply rejects only its matching pending question. Foreign, duplicate and late
frames cannot answer another question or cancel its work. Failed callbacks are
not repeated. Actual Stop, the original deadline and lost-channel outcomes keep
their separate paths.

Original callback errors and invalid requests are retained in the Run's private
`runner-clarification-errors.json`; invalid reply frames are retained in
`runner-clarification-reply-errors.json`. These files use private permissions and
are not model answers. Diagnostic write failure cannot become a new continuation
gate. The worker receipt reports whether parent diagnostics were stored.

The private `runner-clarification-error` frame requires the parent, worker and
clarification bridge from the same package. Notify integration consumers before
replacing this pair: an older worker cannot handle the per-question error frame.
This changes no public MCP schema, card identity or automatic retry behavior.
The next #4529 source increment accepts partial and extended string answers
through the public answer contract, manager, alias adapter, worker and saved
protection/assessment readers. Unknown answer labels remain context; missing
answers are explicit in the native continuation. Extra callback context is
preserved without forwarding host Run/receipt identifiers. Existing marked
values remain protected, including unmatched answers. An older consumer can
still reject or hide these records, so compose these consumers together. No
new card/resource identity or automatic callback retry is introduced. The
transition-dependent parse path and remaining full audit are still open.

## Awaited advisory queries

The advisory tool returns the full original native answer in the awaited call. There is no public advisory job, poll or Stop API. Cancel the host tool request to propagate cancellation; in-flight computation or fees can remain uncertain. Optional `requestKey` correlates identical input/configuration after a lost reply. Use a fresh requestKey for a distinct read-only attempt after a failure; retain original receipts and unknown charges. A conflict reports request_key_conflict, no dispatch, and a fresh suggested key. Same-key retries recover only their original attempt. Browser/desktop effects retain their independent no-replay boundary. Immutable supplied-input answers may reuse a private cache bound to the complete input, selected package, model/settings and private configuration; a reused native ledger describes the original computation, not a new charge. When `resultRead` is present and the host presentation is truncated, call `loki_advisory_result_read` with its family, answerId and ordered offsets. Join `resultChunk.text` until nextOffset is null; this reads completed JSON without inference. Live related-work queries reacquire GitHub data by default; an explicit correlation key reads the original receipt, never fresh data. Normal public tools expose only these queries and the completed-answer reader. Direct library start/get/stop APIs remain private compatibility entrypoints. Cancellation of the final coalesced caller aborts native work and waits for settlement; another active caller retains ownership. A process loss preserves a fence for that advisory request identity, with no automatic takeover. A distinct correlation or changed provider configuration can start a separate read-only attempt; it does not rewrite or resolve the original charge. Old input-wide fences are retained as historical artifacts, not global bans on future analysis.

## Execution checks, PR sources and report reopening

Use `loki_runner_execute` with optional `checks` (`loki.terminal-checks/1`) authored
before dispatch and exact Plan/test references. The receiver evaluates the
original terminal browser observation and persists separate Product verification.
Only explicit text/snapshot/URL predicates are supported. Native Runner's verdict
is unchanged. No supplied result flags or prepared report are accepted as an
execution. See the [input and provenance contract](../../docs/product-design/codex-reporting.md#executed-terminal-checks-and-real-prs).

Original authorized GitHub PR/files reads can be retained through
`loki_context_submit` with `nativeInputs.reportSources` (`loki.report-sources/1`).
Pass its `sourceContextId` to PR-bound checks and to the report selection. The optional report field accepts only a context compatible with `nativeInputs.reportSources`, not an arbitrary work-item context. Unbound reports may omit it with their original operation IDs and hashes. An unsupported context returns `report_source_context_unsupported`; no snapshot is created and no producer computation is needed. Report
reads derive check outcomes only from the original stored operation and validate
source, observation, Plan/test IDs and PR head-or-merge revision associations.
`view:"test-plan"` selects Test plan presentation in the caller's configured UI mode during initial report creation.
The same scope-bound stores retain inputs, operations and report snapshots.

Use `loki_report_open({reportId})` on Show details to read the same retained report without another card, snapshot or producer. Panel mode returns its projection directly. Explicit browser mode resolves a current private preview URL; that URL retains its idle/process lifetime. UI-disabled or unavailable reads fail clearly. The immutable reportId remains the durable navigation identity.

## Reuse a retained browser execution

The public `@loki/capabilities/runner` Node entry supports an optional,
explicit reuse selection before a fresh browser run. `prepareReuse` discovers
completed, validated captures in the existing private Runner operation store and
same scope, or accepts specific prior receipt IDs in `runIds`. It does not mine
global history or create a store. External experimental capture directories are
not supported by this caller path.
Discovery excludes operations without retained captures without making other
eligible captures unavailable. Auxiliary host receipts are stored beside the
native capture directory, not inside it.

Pass `{ current, runIds? }`, where `current` is the complete fresh Runner
request without `reuse`. Preparation dispatches neither a provider nor a
browser. The `loki.runner-reuse-preview/1` response has state
`approval-required`, `unavailable`, or `invalid-arguments`; a complete preview
also contains `runIds`, `query`, `candidates`, `approvalSha256` and source and
current-request binding information. Unavailable or invalid responses can omit
those fields. The host builds authored-intent-only projections with the native
redactor for all known parameter values and targets; observations and final
claims are absent. The preview itself is private source material. Arbitrary
prose is not automatically safe, and original capture permission does not grant
permission to disclose it to a provider.

Inspect the complete preview and approve only if authorized to disclose its text
to OpenRouter native System One JEV (`typesafe/jev-1.13-20260917`) and execute
the fresh task. Pass the exact preview IDs and hash with the unchanged current
request. The binding is checked again against the exact source and current
request. Full current parameters, target and authorization remain fresh; the
selection is advisory and historical content is untrusted. Ordinary callers do
not assemble capture directories, projections or provider callbacks.

```js
import { ComputerRunner } from "@loki/capabilities/runner";

// The host supplies its existing private data root and configures providers.
const runner = new ComputerRunner(privateDataRoot);
const current = {
  requestKey: "fresh-authorized-run-1",
  scenarioId: "read-heading",
  scenario: "Read the page heading without changing anything.",
  params: {},
  target: { initialURL: "https://example.com/" },
};
const preview = await runner.prepareReuse({ current }); // Or add runIds.
if (preview.state !== "approval-required") throw new Error("Reuse unavailable");
// Review the complete private preview and obtain disclosure and execution
// authorization through the caller's own interaction before continuing.
if (!(await reviewAndAuthorize(preview))) throw new Error("Not authorized");
const result = await runner.start({
  ...current,
  reuse: { runIds: preview.runIds, approvalSha256: preview.approvalSha256 },
});
if (result.schema === "loki.runner-operation/1") {
  const original = await runner.get({ runId: result.runId });
  // If Stop is needed: await runner.stop({ runId: result.runId });
  // Read the original terminal result, including resultRead chunks if present.
} else {
  // Inspect result.error and preserve any uncertain dispatch; do not replay.
}
```

The shared catalog exposes the same flow through
`loki_runner_reuse_prepare`, then `loki_runner_execute`, `loki_runner_get` and
`loki_runner_stop`. Pass the same objects to `catalog.invoke`. Native browser
execution uses OpenAI direct Responses with Terra low; JEV selection uses its
separate OpenRouter provider. A NONE selection, unavailable or stale approved
material, or selector/provider failure retains `reuse-not-executed` with
`nativeDispatched: false`; there is no fallback execution. A malformed or
missing approval inside `reuse` fails argument validation before dispatch; omitting
`reuse` entirely requests ordinary execution. Same key and identical input
recover the original operation after a lost reply. Never replay an unknown
operation. Stop covers selection and native execution, but a request to stop does
not confirm cancellation. The native verdict remains `unverified`; independently
verify the result. This is a bounded library/catalog integration, with no UI,
index, global history or new store, and does not establish installed-plugin
acceptance.

The selector retains a complete response up to 8 MiB. If reading fails or the
response exceeds that capacity, its receipt retains an incomplete prefix and
remaining fees are unknown; a valid-looking prefix is not final accounting.

## Passive Runner readiness

The [host-only Runner validation contract](../../apps/codex-plugin/references/RUNNER.md#host-validation)
describes explicitly bound installed controls. It is disabled in ordinary hosts
and adds no public tool arguments.

Inspect `loki_capabilities_list.computerRunner` before authorized execution.
The `loki.computer-runner-readiness/1` response separates packaged native pins,
missing/invalid/configured effective configuration, credential presence, selected
Terra model and initial reasoning and unknown validation. `configured` is not a readiness guarantee.
Discovery makes no inference call, browser input or browser download. A broker
binding leaves upstream/credential validity unknown. Unchecked target/browser and
permission prerequisites remain explicit; local Runner does not need Core login.

Installed Codex discovery additionally exposes `runtime` with the loaded artifact,
installation, connection and scope identities. It never substitutes the current
checkout for the running package. Changed installation metadata reports stale;
matching metadata still leaves host-selection freshness unknown. Compare against
an exact selected artifact, then use supported host reconnect when needed. Read and
reconcile admitted work first, preserve host-thread scope/originals, and never
redispatch unknown effects. Connection-only scope cannot recover after restart.

Use the approved private host environment/profile mechanism for configuration
repair. Allowed inherited fields override saved fields. Unsafe/malformed profiles
are ignored and diagnosed without exposing secrets. Keep first missing/invalid/stale
receipts, repair/reconnect evidence and the original same-goal outcome. Only actual
authorized execution plus relevant original readback can demonstrate that outcome;
credential presence and tool discovery cannot.

### Runner output contract

`ComputerRunner.start`, `get`, and `stop` return `Promise<RunnerOutput>`.
Node TypeScript callers import `ComputerRunner`, result schemas and result types
from `@loki/capabilities/runner`. The packaged entry ships generated declarations
and their portable schema type dependency. Private host/test hooks stay outside
this ordinary client entry.
The public catalog and MCP adapter validate the same shared `runnerOutputSchema`
(`urn:kaijan:runner-output:1`, exported by the library and `@loki/contracts/local`).
Check `schema` before consuming either branch:

- `loki.runner-operation/1`: canonical `runId`, `state`, and `replayAllowed:false`.
  A `finished` operation has a validated retained payload, not a verified test
  pass. Read `result`, or follow `resultRead`/`resultChunk` and use the original
  SHA-256 and byte count. `readCompleteResult` preserves the exact original bytes.
  Its payload stays `loki.computer-runner-operation/1`: `not-executed`,
  `native-exception`, or `returned`. Original native `executionState`,
  `testVerdict`, correlation, provenance, accounting and producer extensions are
  retained without converting partial/refused/failed/stopped/unknown into success.
- `loki.runner-error/1`: `method`, optional correlated `runId`, and safe `error`
  with `code`, `message`, `requestDispatched`, and `recovery`. A correlated ID does
  not prove that initialization persisted. `requestDispatched` describes new
  execution from this call; `null` means it may have happened. No error permits
  replay or establishes cleanup. MCP marks this branch `isError:true`; malformed
  MCP arguments remain protocol error `-32602`. Direct API argument failures use
  `invalid_arguments`. Other codes are `request_key_conflict`,
  `operation_not_found_in_scope`, and `operation_unavailable`.

`stopRequested` records a Stop request, never confirmation that effects or
charges stopped. Read the original operation for its retained terminal result.
`unknown`, `not-started` and `stopped-before-start` remain distinct. Reporting
validates Runner reads before consuming canonical fields and preserves private
paths as references rather than fetched evidence. The optional #2334
`executionReport`, `recovery`, and `pendingClarification` fields have shared types;
these declarations do not enable clarification, escalation or resume by themselves.

For a new bounded acceptance case, the opt-in
`test/runner-live-contract.e2e.mjs` takes `LOKI_RUNNER_CONTRACT_LIBRARY` and a fresh
`LOKI_RUNNER_CONTRACT_EVIDENCE` directory. It uses the existing native provider,
explicit headless host binding and isolated localhost page. Its exclusive intent
file prevents replay in the same evidence directory. Keep original uncertain
runs; this harness does not authorize a replacement, global installation or demo.

## Runtime settings

See [Runner model settings](../../apps/codex-plugin/references/MODELS.md) for the host command, environment precedence and supported limits. The supported analysis families have a separate setting. Other native stages keep their packaged pins.
