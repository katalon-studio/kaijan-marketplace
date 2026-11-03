---
name: setup
description: Set up Kaijan and prepare the selected application. Use for onboarding, setup and connection readiness. Introduce this as Kaijan setup with a friendly English welcome, not internal skill narration.
---

# Set up Kaijan

Read the chat guidance in the [shared Product MCP instructions](../../references/local-capabilities.md).

## Start with a friendly welcome

Write the product welcome, onboarding prompts and map completion/blocker messages
in English. Use the supplied project/goal. Open with a short software welcome,
not a narration about skills, tools, package inspection or delegation. For example:
“Welcome to Kaijan! Let's get your application ready so you can start
testing.” Adapt the second sentence when the actual application or next action is
already known. Do not repeat the welcome when resuming an existing setup.

Reuse the current project, explicit selections and matching saved context. When
application context is missing, use the host's supported `list_projects` inventory
if available. These are Codex saved projects, not folders discovered by scanning
the machine. Match the selected host/project ID and its actual local directory;
a ChatGPT-only project without a local source directory is not a Git repository.
Ask “Which application would you like to start with?” with the actual usable
candidates, preserving their returned labels. Resolve a named saved project
before asking for its folder. Do not choose among ambiguous candidates by recency.
If the inventory is unavailable, use an explicitly supplied directory or ask for
it; do not claim that saved projects were searched.

During input collection, use Codex's native Question for genuinely missing or
ambiguous setup input. At completion, use it to resolve an open next-action
choice when the caller has not selected an outcome. If the original request
already authorizes a clear full test/report flow and inputs suffice, continue
with the installed `test-request` skill instead of asking for another phase choice. Derive choices from actual candidates; no default three-goal menu. An unanswered
or highlighted option supplies no selection. Never change approval mode to show
a workflow question. A supported explicit typed answer can cover a missing native
Question control, with that limit stated.

## Prepare automatically and continue

Resolve this installed plugin's root two directories above the skill. Read
`loki-build.json` for the fixed profile, version and available integration. Use
only that profile's installed skills/tools, not a source checkout or another
profile. Report an inconsistent package as a concrete blocker.

For application Setup, call the installed `application-setup` skill in this same
conversation. Start or reuse its map automatically as soon as the selected inputs
and actual authority suffice. No second create-map assignment or Continue question
is needed. Keep prepare, get/wait, Stop and recovery in the owning conversation;
follow that skill's lifecycle and original context/run/result readback. Helpers
remain useful for genuinely independent work, but must not own the Setup lifecycle
or source consent. Keep this conversation active while the map runs and continue
only genuinely independent onboarding work. Map communication
is limited to one completion or an actionable blocker; no running/stage messages,
percentages or repeated progress summaries. Structured tool diagnostics may still
contain the original progress.

For a new source operation, default to latest main. Honor a selected branch, PR
head or exact commit; resolve once to a full SHA. Preserve the original SHA and
request key during retry/recovery. Keep dirty/untracked source excluded, and
report an unavailable upstream rather than calling a stale local ref latest.
Ask for target/browser inputs only when the selected operation actually needs them.

Map-dependent steps wait for actual map readiness. Independent work keeps its
own prerequisites. Normal packages call the admitted real Setup map adapter and
never fall back to fixtures or analysis CLIs. A settled source-inferred fragment
with a processed page and no native stage failures can be ready for the selected work
item. Read its structured
readiness scope and report its coverage limits. Application coverage remains
incomplete; scoped readiness does not prove browser behavior or consumer acceptance.
Empty or unprocessed maps stay incomplete, and unknown accounting stays uncertain.

Consume Setup tools through their advertised input/output schemas. Check
`isError` and read `structuredContent`; keep safe execution errors and protocol
argument failures distinct. Handles and completed waits do not prove readiness.
Follow the installed `application-setup` guidance for exact context state,
bounded wait, Stop receipts and pending or unknown-effect recovery.

## Connections and missing prerequisites

Kaijan has two independent MCP connections: Core HTTP for cloud account/workspace
and Work Item operations, and Local stdio for application Setup, analysis,
planning, Runner and reports. Core sign-in is not a prerequisite for local
capabilities, including browser or macOS desktop Runner when that mode is
available. Runner still needs its model-provider configuration, runtime and
explicit scenario, parameters, target and action authority. Credentials for the
application under test are separate from Core OAuth and provider credentials.

Distinguish installed/enabled, server discovery, current-chat tool availability
and operation readiness. If local tools are missing, report that specific
boundary; do not infer that Core login will fix it. Discovery in another process
does not prove tools are callable in this chat. Inspect the current tool inventory
and use `loki_capabilities_list` when available. Recommend reconnect/reload only
through a supported host control, and verify tool availability afterward before
claiming recovery. Ask for Core sign-in only when the requested operation needs
Core; do not make it a universal setup gate.

The native post-install offer and later Set up action use this same entrypoint.
Supported installation preparation and OAuth remain host-owned; this skill runs
after Set up submission. Reuse valid connections. The offer alone does not prove
that every server authenticated, nor does OAuth grant source transfer or browser
actions. Preserve the pending application/goal across cancelled login or reconnect.

- Core reads: use installed `work-item` and the profile's connection-status
  tool when relevant. Confirm only observed account/workspace. Use an explicit
  Work Item UUID for a read; never create one as an onboarding prerequisite.
- Local source: use the selected canonical repository and frozen commit. The real
  adapter must establish source-transfer authority for sending committed excerpts
  to its configured provider. Keep actual consent distinct from a workflow choice.
- AI: never collect keys or configure a provider in onboarding. Report a missing
  provider only when the requested real operation needs it. Browser/Core tokens
  are not provider credentials.
- GitHub: only if the goal requires it, read
  [GitHub setup and recovery](references/github-setup.md). Local mapping does not
  inherently require GitHub login.

Do not add optional connection questions to fill time while a map runs.
A connection-only request ends with its supported next action and does not start
unrelated source analysis.

## Finish in the same conversation

Verify the original context/run/result through the installed `application-setup`
lifecycle and API in this same conversation, or
read back the genuine retained-map configuration when that reuse route applies.
Keep a saved configuration distinct from generated readiness and preserve partial
map status. Prepare
the applicable next action or selection below, then combine it with one concise
completion in the final reply. Do not publish map completion in commentary before
the Question: its rationale can explain task relevance without repeating map
status. A blocker is reported once with its recovery action. Missing real
provider/authority or consumer support never licenses a simulated completion.

Continue the user's explicit goal when its prerequisites and authority permit it.
When the next action has not been selected, read
[next-action discovery and selection](references/next-actions.md) and present its
contextual choices before ending Setup. “I will choose what to do next afterward”
means the choice is still open, not that suggestions should be skipped. Only skip
suggestions when the user explicitly declines them or asks to stop. Use supported task metadata for the selected project when available;
otherwise use the supplied conversation/project context. Present a small set of
concrete Kaijan capability actions with their contextual reasons, expected
results and actual readiness conditions, using a native Codex Question for the
user's selection. A chat/source read is an input step, not a substitute for the
relevant Kaijan action. Neither a generic “Which work item or scenario next?” nor “I’ll wait for your
choice” alone completes onboarding. Do not repeat the map completion when
presenting a Question or its typed fallback. In the same conversation, preserve an accepted selection
instead of repeating the suggestions.
Keep source inference, controlled output and observed browser behavior distinct.
A finished turn/helper is not a map pass, confirmed Stop or OS notification receipt.
Read the original result in the owning conversation; do not promise idle-chat wakeups,
restart-surviving execution, another daemon or cloud orchestration.

Before ending the initial Setup turn, verify the actual configuration or blocker,
explain the applicable action choices and their prerequisites, and emit the native
Question when the next action is still open. A text list alone does not complete
that choice step. "Do not execute anything yet" limits execution; it does not
decline suggestions or the choice card. Leave the Question unanswered until the
user decides. An explicit request to stop or skip suggestions still takes precedence.
