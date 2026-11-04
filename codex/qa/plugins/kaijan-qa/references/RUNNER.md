# Explicit standalone Runner integration

The plugin calls the public Node `run(input, options)` API of
`@katalon-loki/computer-runner` for browser execution and
`@katalon-loki/mac-computer-runner` for macOS desktop execution. Runner owns the native Luna computer-tool prompt (initially low reasoning),
selected official Playwright MCP tools, browser lifecycle, Stop and traces. The
plugin invokes that API in one isolated Node process per execution, so native
cleanup owns only that invocation’s browser/MCP children. It never invokes the
component CLI or implements browser actions. Planning remains a proposal; only `loki_runner_execute` starts execution.

```json
{
  "requestKey": "one-authorized-execution",
  "scenarioId": "T1",
  "scenario": {
    "id": "T1",
    "method": "browser UI observation",
    "prerequisites": [],
    "steps": ["Read the page heading without changing anything."],
    "expected": {
      "text": "The heading is visible",
      "authority": "hypothesis",
      "refs": []
    },
    "execution_gaps": []
  },
  "params": {},
  "target": {
    "initialURL": "https://example.com",
    "allowedHosts": ["example.com"]
  },
  "executionMethod": "browser-ui",
  "unresolvedInputs": [],
  "options": { "limits": { "calls": 3, "browserInputs": 5, "ms": 60000 } }
}
```

Every call supplies complete scenario content and explicit friendly scalar
`params`, including `{}`. `scenarioId` identifies the complete selected scenario. A string
scenario is also supported. Supply the complete structured test to retain
proposed expectations, authority, hypotheses, prerequisites and execution gaps.
`planRef` is optional JSON provenance. IDs, saved context and plan references
never substitute for content or resolve missing execution inputs. Original
scenario/params stay in the private frozen operation request. The adapter does
not interpret a proposed `method` description as permission or an executable
method. `executionMethod` defaults to `browser-ui`; a method other than `browser-ui` or `desktop-ui`, or
nonempty `unresolvedInputs` returns `not-executed` with zero provider calls.

For headless browser execution, set `options.headless: true` on
`loki_runner_execute`. Omission keeps the headed default; `false` selects headed
execution. The option passes to the isolated Runner host, stays in the frozen
request identity and appears in `executionConfig.headless` and
`executionHost.headless`. It does not change the native scenario input. Desktop
requests with this option return `not-executed` with zero provider calls.

`target.initialURL` must be an absolute HTTP or HTTPS URL without embedded
username/password. Caller-authorized local targets such as
`http://127.0.0.1:5173` are supported. This is the Runner owner's correction of an
incidental HTTPS-only target restriction; it does not change provider HTTPS,
browser certificate verification or target/action authorization.

Host provisioning requires Node 22.13+ (the plugin bundles Node 24)
and `OPENAI_API_KEY` in the MCP host environment. The Runner calls OpenAI native
Responses directly; the Planner OpenRouter/LiteLLM profile is not a substitute.
Compatible Chromium is downloaded on first execution, then reused from
Playwright's versioned user cache. It is not included in the plugin archive and
does not require an installed Google Chrome. Browser preparation respects Stop
and the execution time limit; download failure returns before browser launch or
provider calls. Imports, tool discovery and analysis do not download browsers.
For browser logins, use [private parameters](private-parameters.md). The installed
host command returns `privateParams` references scoped to this conversation and
the approved hosts. Kaijan resolves these before dispatch and adds the names to
`options.secretParameterNames`. Keep ordinary inputs in `params`. Raw credentials
must not appear in MCP arguments. The adapter never reads unrelated browser
profiles or live history. Existing-session attachment and persisted memory are
not implemented by this delivered Runner. Its native limits remain 80 calls,
150 returned browser inputs and ten minutes; options can lower those bounds.
Native admission additionally limits serialized scenario text to 8000 characters,
50 scalar params, 120-character names and 4000-character string values. Those are
producer restrictions, not a claim of semantic safety or general capacity.

`get` and reconnect read the original operation. Reusing the same key and exact
input returns it; changed work under that key refuses. A lost owner or uncertain
effect never licenses replay. `stop` forwards native cancellation; read the
terminal result for actual cancellation, partial artifacts, cleanup and unknown
fees. Operation `finished` means a result was retained. Native `executionState`
and `testVerdict: unverified` remain separate. A normal model ending is not a
verified business pass. Provider status/request IDs, action/observation records,
usage and estimated/unknown fees remain in native private evidence. The browser
trace does not contain provider HTTP transport.

Browser Runner quietly retries complete HTTP 408/409/429 and 5xx responses inside
one logical provider request, with at most three attempts, 1s/2s backoff and
Retry-After extension capped at 30s. Every attempt consumes the existing caller
model-call budget. It preserves request bytes,
previous_response_id and completed browser actions. Stop and the remaining run
deadline cover backoff, requests and response-body reading. Direct and configured
host transports keep their selected route; redirects are refused. An uncertain
transport or incomplete body, invalid successful JSON, invalid/auth input and
browser actions are never automatically retried. Exhaustion remains terminal;
inspect originals and reconcile effects before any separately authorized work.
Each provider attempt, response/error, delay and available usage stays in private
native evidence. Missing usage or fees remains unknown, including recovered
attempts. Discovery reports the bundled browser provider policy separately from
zero whole-execution retries; desktop retry behavior is unchanged.

`nativeResult` retains the returned Runner summary with explicit safe projections
for declared sensitive content; private originals stay unchanged. `assessmentFragment` maps it explicitly to outcomes/evidence/target/
provenance: the outcome preserves the test ID and native `unverified` label; the
model answer remains a claim; the native terminal browser observation is supplied
as protected JSON text when available. Its body innerText and ariaSnapshot can include
offscreen text; they are not screenshot or viewport-visibility evidence. Trace and manifest references have null text
and bytes and remain unresolved. Raw screenshots, requests, storage state,
Chrome profile and Playwright traces stay in the private operation directory.
Do not copy those to Drive/shared reports. No artifact is authenticated by this
mapping. Host-derived hashes identify bytes, not semantic support.

## Browser clarification and recovery contract (#2334)

The native strict `execution_status` function reports `needs_input`, `stuck`, `blocked` or
`complete`. Browser nativeResult
`executionState` is exactly `completed | incomplete`: completion requires a
coherent explicit `complete` with known effects and no remaining steps or
questions. Stop, deadline, failure, absent/invalid reports and uncertain effects
before that decision yield `incomplete`. Accepted disposition is frozen before
capture/cleanup; late cleanup deadline/Stop observations are separate and cannot
reverse it. `terminal.actor` and `terminal.reason` retain the cause. Final
prose or capture alone is insufficient. Completion and step reports are
model-authored and unverified; returned actions do not prove steps. Independently
observe the application outcome. `testVerdict` remains `unverified`, and Product
terminal checks cannot pass an incomplete run.

For observation-only work, completion records what was observed; it does not
invent a persistence requirement or establish an accepted defect. Keep caller
hypotheses, attempted actions, observations and unresolved selections distinct.
An icon or arrangement change alone cannot prove a requested theme/layout state.
See the [caller preparation and result guidance](../capability-skills/run-test/SKILL.md#execute-an-explicit-ui-scenario).

Desktop remains unchanged: its native executionState is `completed`, `cancelled`,
`blocked` or `unknown` and it does not support this clarification or recovery contract.
A worker/native exception can instead yield `nativeResult: null` and operation
`effects: unknown-do-not-replay`; do not fabricate a browser state. Wrapper state
remains `accepted | running | finished | unknown | not-started | stopped-before-start`;
`finished` can retain an incomplete result and is not a pass.

`loki_runner_get` returns `pendingClarification` as null or an object with
`schema: loki.runner.clarification/1`, `clarificationId`, `reason`, string arrays
`completedSteps`, `remainingSteps`, `evidence`, `questions: {id, question, kind}[]`,
`deadlineAt` and `state: live | unknown`. Question fields are strings. `live`
requires this host's running pending callback, no Stop and an unexpired deadline.
`unknown` retains an unresolved request without live authority; restart, disconnect,
Stop or deadline cannot restore it. Existing lifecycle `state` fields remain unchanged.

A live clarification also returns top-level `nextAction` with `kind: input-required`,
`tool: loki_runner_answer`, the original `runId`, `clarificationId`, `deadlineAt`,
safe projected `questions` and an `instruction`. This requires caller action, not
repeated polling. Combined `loki_test_get` exposes the same next action at the top
level and sets `status.execution: waiting-for-input`. Answer from known authorized
context or ask the user now. If no answer can arrive within the deadline, stop the
same run and keep partial results. Unknown, stopped or expired requests do not
return a next action that authorizes an answer.

For a live request, submit `loki_runner_answer({runId, clarificationId, answerKey,
answers, sensitiveQuestionIds})`: runId and clarificationId are hex64 strings, answerKey is a nonempty
string, and `answers: Record<string, string>` has nonempty values for the exact
question IDs. Optional `sensitiveQuestionIds` lists unique exact answered IDs
whose full unchanged values are newly sensitive. Omission adds no sensitivities;
declaration metadata/order is part of exact receipt identity. Native and host
redactors register declared values before continuation, and reconstruct public
protection from immutable parameters and retained declarations after restart.
Public reason/steps/question/report/UI prose is projected; IDs/enums/hashes and
evidence references are preserved. Unsafe model-authored identities or missing or
corrupt protection inputs produce explicit withholding, never raw fallback or
resume authority. Raw originals remain private. Supply steps, preconditions, fixtures, expected results or params
within original authorization; no Runner chatbot or authority expansion is required.
The receipt is `{schema: 'loki.runner.clarification-answer/1', runId,
clarificationId, answerKey, status: 'retained'}`. It proves durable private answer
retention only, not delivery or execution. Stop, deadline or IPC loss can prevent
dispatch; inspect the correlated native function output and subsequent result for
continuation. The same key and exact parsed JSON bytes retry reads the original
receipt without redelivery, even after Stop or restart; conflicting, stale or
wrong-scope calls cannot dispatch. Answer and request originals remain private.
The execute request is immutable, and any live continuation uses the same worker,
browser and provider history through the tool-call response. Waiting consumes the
original deadline.

Node hosts use `options.requestClarification(request, signal): Promise<{answers:
Record<string, string>}>`. Its request has `schema: 'loki.runner.clarification/1'`,
`clarificationId`, `providerResponseId`, `callId`, `reason`, string arrays
`completedSteps`, `remainingSteps`, `evidence`, `questions: {id, question, kind}[]`,
and `provenance: 'model-authored-unverified'`. The IDs and question fields are
strings; clarificationId is SHA-256 of the response ID, a NUL separator and the
call ID.
The callback is a host function, not execute input; unavailable callback means
incomplete. It carries no source grants or authorization.

A `blocked` report ends the run incomplete without escalation. Use it for a task
restriction, a prohibited transition, denied access or an unavailable service
that reasoning cannot resolve. Preserve the reason and remaining checks. Missing
caller information uses `needs_input`; navigation or reasoning difficulty uses
`stuck`. The host uses the explicit status, not keyword guesses about the reason.

The first `stuck` with known effects raises Luna effort low to medium for one
recovery phase within original limits. A second `stuck` terminates with reason and
completed and remaining steps; missing input does not consume escalation. Errors,
uncertain effects, safety, Stop, deadline and exhausted limits never auto-recover
or replay. `effortAccounting` counts provider attempts, including retries, by
low and medium effort. Native `executionReport` and its evidence references retain
model-authored claims and original saved bytes, not independent semantic proof.

## Reuse a retained browser execution

For an authorized fresh browser task, call `loki_runner_reuse_prepare` with
`{ current, runIds? }`. `current` is the complete fresh
`loki_runner_execute` request without `reuse`. If IDs are omitted, the host
discovers completed, validated browser captures in the existing private Runner
operation store and the same scope; explicit IDs select prior Runner receipts.
There is no global history mining or new store. External experimental capture
directories are not supported by this normal tool path. Preparation dispatches
neither a provider nor a browser.
Discovery excludes operations without retained captures without making other
eligible captures unavailable. Auxiliary host receipts are stored beside the
native capture directory, not inside it.

The `loki.runner-reuse-preview/1` response reports `approval-required`,
`unavailable`, or `invalid-arguments`. A complete preview includes `runIds`,
`query`, `candidates`, `approvalSha256` and binding to the exact source and
current request; unavailable or invalid responses can omit those fields. The
host uses the native redactor on all known parameter values and targets to create
projections of authored intent only, with no observations or final claim. Current configured sensitivities also protect historical authored prose before
the disclosure hash is computed. A retained `finished` operation is not proof of
native completion or successful work; history remains advisory provenance. The
preview itself is private source material: arbitrary prose is not automatically
safe, and permission to capture does not authorize provider disclosure.

Inspect all preview text and proceed only with authorization to disclose it to
OpenRouter native System One JEV (`typesafe/jev-1.13-20260917`) and execute the
fresh task. Call `loki_runner_execute` with the identical `current` fields plus
`reuse: { runIds: preview.runIds, approvalSha256: preview.approvalSha256 }`.
The host checks the binding again, then makes an advisory selection. Current
params, target and authorization stay fresh; historical text is untrusted.
Callers do not construct directories, projections or provider callbacks. The
native browser Runner uses OpenAI direct Responses and Luna low.

Use `loki_runner_get` to read the original operation and `loki_runner_stop` to
request Stop during selection or native execution. NONE, unavailable or stale
approved material, and provider errors return retained `reuse-not-executed` with
`nativeDispatched: false`; there is no fallback. An incomplete `reuse` object
fails argument validation before dispatch; omitting `reuse` entirely requests
ordinary execution. Repeat the same key and input to recover a lost reply; never
replay an unknown operation. Stop is a request, not confirmation. Native verdicts
remain `unverified` and need independent verification.
The selector retains a complete response up to 8 MiB. If reading fails or the
response exceeds that capacity, its receipt retains an incomplete prefix and
remaining fees are unknown; a valid-looking prefix is not final accounting.
`nativeDispatched: false` does not imply zero selector calls or fees. Public reuse
and retained-selection prose, including `currentTask` and selector message text,
uses the same configured/declared-sensitive protection as current execution.
Derived content can carry `redaction: {schema: "loki.runner.safe-projection/1",
revision: number}`; IDs, enums, hashes and accounting remain exact. Raw selector,
selection, approval and current-request originals stay private. Unsafe identities
or unavailable required protection inputs withhold public content rather than
fall back to raw bytes, including for selector-bearing native-null refusals.

Node callers can use the same flow with `ComputerRunner.prepareReuse`, `start`,
`get`, `stop` and live clarification `answer` from `@loki/capabilities/runner`; see the complete example in
the [capabilities README](../../../packages/capabilities/README.md#reuse-a-retained-browser-execution).
This bounded library and catalog integration adds no UI, index, global history or
new store and does not establish installed-plugin acceptance.

## Terminal checks and PR sources

For an authorized Expected/Actual check, add `checks` to the ordinary
`loki_runner_execute` input before dispatch. The Product receiver compares the
returned terminal observation with these authored predicates and persists the
result as separate `verification` with provenance `product-terminal-checks/1`.
It never accepts caller-supplied pass/fail flags or rewrites nativeResult.

```json
{
  "planRef": {
    "answerId": "<exact completed Plan answerId>",
    "resultSha256": "<exact Plan digest>",
    "selectedTestIds": ["<selected test ID>"]
  },
  "checks": {
    "schema": "loki.terminal-checks/1",
    "repository": "<owner/repository>",
    "sourceRevision": "<actual 40-character source revision>",
    "pullRequestUrl": null,
    "tests": [
      {
        "testId": "<selected test ID>",
        "title": "Read the expected terminal heading",
        "deliberateFailure": false,
        "checks": [
          {
            "id": "heading",
            "title": "Check the terminal page text",
            "field": "text",
            "operator": "contains",
            "expected": "<caller-authorized heading>"
          }
        ]
      }
    ]
  }
}
```

The snippet adds to the full scenario/params/target request above; placeholders
must be resolved. Fields are text, snapshot or url; operators are contains,
not-contains or equals. A scenario can have multiple authored terminal checks
associated with exact selected Plan test IDs. These are terminal predicates, not
claims that every proposed step or test workflow was executed independently.
Pre-dispatch validation reads the original Plan only to verify identity and scope;
the caller still supplies the complete execution scenario. Changing a case uses
a new requestKey and execution. Old request/results stay unchanged.

Missing observations, Stop before the terminal decision or incomplete native execution block the checks. A
terminal match is not viewport visibility, saved application data or a general
semantic pass. Expected/Actual and evidence hashes are retained; raw private
traces remain private. A deliberate failing control stays labelled as such.
`executionConfig` records the actual adapter method, browser, target, explicit
tool trigger and zero whole-execution retries. Browser providerRetryPolicy is
retained separately from nativeResult; it does not claim an external CI result.

For a PR-bound case, first read the original PR and all selected changed-file
pages through an authorized existing GitHub interface. Use `loki_context_submit`
with `nativeInputs.reportSources` set to:

```json
{
  "schema": "loki.report-sources/1",
  "pullRequests": [
    {
      "capturedAt": "<actual ISO capture time>",
      "record": {
        "pullRequest": "<full original REST PR object>",
        "files": "<original changed-file array>"
      }
    }
  ]
}
```

The placeholders denote an object and array, not literal strings. Context Intake
derives display fields/hashes from these original source inputs and accepts no
execution outcomes. Pass the returned sourceContextId to the Runner input, set
checks.pullRequestUrl to that exact PR URL and use its actual head or merged
revision. Select the same sourceContextId with the original Plan/Runner references
in `loki_report_show` and `view:"test-plan"`. The report reads Product check results
only from the stored execution. Reopening never dispatches a producer. A PR with
no associated run stays Not run. This adds no GitHub connection or write authority.

To assess, explicitly combine the fragment with original `work_item`,
`requirements` (or null) and `proposed_tests` (or null), set schema to
`work-verifier/supplied-test-evidence/1`, and submit to
`loki_test_evidence_assess`. Include complete original test text/provenance in
proposals; do not invent an expected result or turn a model claim into a pass.
The exact requested URL stays in the private frozen request; the assessment target
contains its origin and SHA256 plus the native redacted terminal URL, so query
credentials are not copied into another model request. The adapter never starts
assessment or decides acceptance automatically.

Builds copy the unchanged Runner package and its installed dependency graph into
the output's private module closure. This preserves native package resolution and
the official Playwright MCP entry point. Source pins identify the accepted package
bytes; the dependency manifest and normal lockfile identify installed versions.
Building does not install globally, restart the host or upgrade an existing cache.

## Configure the separate analysis provider

`OPENAI_API_KEY` configures native Runner and the fixed Luna planning, supplement
and supplied-evidence producers. Their native OpenAI route cannot use an
OpenRouter credential. The existing OpenRouter profile is for native JEV; its
complete process environment requires `LOKI_MODEL_PROVIDER=openrouter`,
`LOKI_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, and the existing secret
`LOKI_OPENROUTER_API_KEY`. Forwarding only key/base variables does not select the
provider. An already authorized LiteLLM profile retains its own declared settings.

The host supplies the approved provider environment or provisions its existing
private Product profile through the packaged host command. Read `skills/setup/references/provider-setup.md` and run the bundled Node with `scripts/provider-settings.mjs show` or `configure --from-file /absolute/path/to/approved.env`. The command prints no keys and needs no source checkout. For an explicitly authorized
operator with the complete configured environment, the public library exposes
`adoptProviderEnvironment(privateProductDataRoot)`. This stores only the private
provider profile and starts no analysis. Do not use a Research data-root flag or
an analysis CLI. A new Product profile needs its own authorized configuration.

Simple planning input requires `title`, `body` and a nonempty string `url` source
identity. A real local source-file URI/pointer is valid for a local work item;
null or an empty identity is rejected before dispatch. Do not fabricate a GitHub
URL or claim that a missing external source was supplied.

## Worker lifecycle and local trace viewer

The receiving worker imports the public Node API, receives exactly one full
request over private IPC, forwards native progress events and returns the original
JSON result. Stop forwards to its AbortSignal. Host disconnect also aborts further
actions. The host waits for worker exit; it retains private worker stdout/stderr,
ordered progress events and a worker lifecycle receipt beside the operation.
Worker loss leaves unknown effects and partial artifacts; get/reconnect never
starts a replacement worker. There is no component CLI bridge or shared browser
process. `executionHost` is separate receiving metadata; nativeResult is unchanged.

Browser Runner enables Playwright tracing by default before initial navigation and saves
it during normal completion, provider failure and Stop. Check `trace.saved` and
`trace.sha256` before opening `nativeResult.trace.path`. From the package root,
use its existing pinned Node/Playwright dependency without a global install or
download:

```sh
./capabilities/runtime/node ./capabilities/library/node_modules/playwright-core/cli.js show-trace \
  --host 127.0.0.1 --port 0 "/absolute/path/from/nativeResult.trace.path"
```

Keep that viewer process alive while inspecting its local browser tab. Its
screenshots, DOM, browser actions and browser network do not establish provider
HTTP transport; read the separate private transport records for that. Raw traces
can contain target credentials. Keep them local. Close the task-owned viewer tab
and stop only its viewer process after inspection; preserve unrelated tabs and
applications. A failed host/worker may have only partial files and no saved trace.

## Local macOS desktop execution

`loki_runner_execute` also accepts `executionMethod: "desktop-ui"`, a full scenario,
explicit friendly named `params`, and `target: {app: "com.example.App", launch: true}`.
Use `options.limits.desktopInputs` instead of `browserInputs`. Keep the target app
on the main display. The same get/Stop tools retain their durable run lifecycle.

The packaged Appium/Mac2 backend uses the plugin's Node runtime. Xcode and macOS
UI Automation/Accessibility permission are host prerequisites; no global Appium
or Peekaboo install is needed. Runtime provisioning happens on execution, not
MCP discovery. Only one desktop run is allowed at a time. Appium preserves the
app's current state and leaves it open after completion/Stop.

Desktop evidence consists of private screenshots, structured actions/parameters,
geometry, provider receipts, optional AX reads and Appium logs. It has no
Playwright trace. `completed` means Luna finished issuing actions, not an
independently verified pass. Inspect the visible result separately. Report calls,
desktop inputs, failures, missing usage and estimated cost per 10,000 inputs.

## Passive Runner readiness

Inspect `loki_capabilities_list.computerRunner` before authorized execution.
The `loki.computer-runner-readiness/1` response separates packaged native pins,
missing/invalid/configured effective configuration, credential presence, fixed
Luna/low model and unknown validation. `configured` is not a readiness guarantee.
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

## Host validation

An ordinary installation has no fault plan. The existing public
`loki_runner_execute`, `get` and `stop` arguments are unchanged; the answer
interface is described above. No tool argument selects faults, endpoints, models
or credentials. The following interface is only for a sealed, isolated
host control. It is not a provider readiness check or a production fault API.

A validation launcher can call the existing `installedLocalMcp` host with an
explicit `runnerValidation` construction option. The test-only
`test/fixtures/runner-validation-launcher.mjs` reads one host-selected private,
regular, canonical plan file; it is not included in ordinary packages. A missing,
public, linked or mismatched plan fails control setup. Never select it through
an ambient global hook or modify a live human installation.

The versioned binding is `loki.runner-validation-binding/1`. It contains a binding
`id`, the exact payload `artifactDigest`, the actual host conversation `scopeId`,
the selected `route` (`direct-openai`, `managed-broker`, or `controlled`), and `operations`.
Each operation binds a `requestKey` and SHA256 of the canonical complete parsed
public request. It has a finite list of faults with unique IDs. A fault selects
one logical `call` or the next logical request after a declared returned native
`afterInput` count, plus its `attempt`. `transient-http` generates a local HTTP500
response before upstream dispatch; optional Retry-After remains within the native
30-second cap. `held-body` generates local headers and an incomplete body with a
finite `holdMs`; native Stop/deadline also abort the body. Empty faults are useful
for a separate active-input Stop observation. After-input selection records the
actual resolved request digest and completed-input prefix; do not infer it from
an aggregate count or a requested action alone.

The explicit `controlled` route accepts only nonempty `controlled-response`
records, each with an authored Responses JSON `response`. It needs no upstream
credential and cannot forward an unmatched call. Other routes reject these
records. This route is for a caller-authorized, disclosed browser/trace control,
not AI behavior acceptance or provider readiness. The existing artifact, native
scope, exact request, worker digest and marked-launcher checks still apply.
Its journal separates authored response construction and consumption and records
`upstreamForwarded:false`; discovery labels its transport `controlled` and
credential `not-required`. No ordinary tool argument, environment flag or normal
package can activate it. The real public Runner still executes browser actions,
persists original artifacts and supplies the unchanged native verdict. A genuine
Plan remains its actual producer answer; controlled transport never creates or
imports a completed Plan/Runner catalog or a passing result.

A saved Runner-only report opens its existing inline card and native details
with no Plan requirement. Details start on Runs when no Plan is selected;
the selected Run retains its original ID, digest and unverified verdict.
View trace uses that exact Run. This presentation does not generate a Plan,
evaluate the scenario or alter the saved report.

The native card keeps its active resource identifier across additive report
changes. Saved native tool calls can retain that identifier after the server
updates; changing it alone must not make the current report unavailable.

Fault IDs use 1–128 visible ASCII identifier characters (`A-Z`, `a-z`, `0-9`,
then also `.`, `_`, `:`, `-`) and are validated before any operation can dispatch.
The prefix counts the native returned computer and MCP browser input operations,
including non-list tab operations. It retains source, row/call identity and
timestamps; mixed input order uses the original provider response output order.
Prepared, constructed and body-consumed response receipts are distinct.

An optional boolean `headless` is a trusted host selection in the private binding and worker token. When selected, the derived build metadata must declare the same `validationContext.headless`. The private binding fixes the worker/native mode. A public `options.headless` value must agree with that mode. Missing or mismatched worker mode fails before dispatch. Mode participates in the binding digest; `nativeInputSha256` continues to identify only the unchanged native input. The validation journal, worker receipt, operation configuration and native protocol retain the selected mode. Omission preserves ordinary headed execution. Use explicit `true` for isolated automated checks that do not need visible UI.

The derived validation artifact must declare `validationContext` in its build
metadata with `kind: runner-control` and the exact private plan `planSha256`.
Retain a distinct version/build ID, its normal artifact lineage, launcher digest,
installed inventory and plan digest. The payload and private binding must match.
An artifact marked for validation cannot silently start without the binding, and
an ordinary artifact cannot activate it. Use the supported package/bundle and
isolated Codex installation paths; do not patch host caches. Report this derived
context rather than implying that ordinary package bytes were tested.

Service construction passes the validated binding only to the selected Runner.
Before admission it checks context and the complete request; before native launch
and at the isolated worker it checks the selected route and frozen native input.
The existing durable request reservation, worker IPC, native parser, provider
policy, browser actions and results remain in the path. Unmatched calls use the
same selected sender and request unchanged. There is no shim retry or route
fallback. A transport without a response has unknown forwarding/effects.

`runner-validation.jsonl` is private beside the normal worker receipt. It records
binding/run identity, logical request digest, prior response, attempt, completed
input prefix, local-response versus upstream dispatch/headers/unknown effects,
body consumption/interruption and unused faults. A selected/prepared response is
not an observed body read; a dispatch intent is not proof of forwarding. Keep
these receipts with the normal original attempts, action/effect sequence, native
result and cleanup. Public get/Stop still act on the same admitted run ID. A
control with an unused fault, missing active-input observation or incomplete
scenario cannot be promoted into an installed row pass. Never replay a prior
incomplete/unknown run to replace its first result.

Runner execute/get/stop share `urn:kaijan:runner-output:1`. Branch first on
`schema`: `loki.runner-operation/1` has canonical `runId`, `state` and retained
result transport; `loki.runner-error/1` has safe `error.code`, `recovery`, and
`requestDispatched` (null means uncertain). MCP sets `isError:true` for the error
branch; malformed arguments remain -32602. Never poll an error as an operation or
replace an uncertain execution. `finished` means the original payload was retained
and validated, not that the user task passed. Preserve its native result and
exact paging bytes; Stop is requested, not confirmed, by `stopRequested`.

## Runtime settings

See [Runner model settings](MODELS.md) for the host command, environment precedence and supported limits. The supported analysis families have a separate setting. Other native stages keep their packaged pins.
