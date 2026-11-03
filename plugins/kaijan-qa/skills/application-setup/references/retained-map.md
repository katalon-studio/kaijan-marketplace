# Reuse a retained application map during Setup

Use this route when the selected application already has a genuine map imported
through the installed map APIs. It configures reuse, not generation. Do not call
the controlled generator merely because the QA package offers it.

## Verify the selected source and map

Resolve the actual selected project label, host/project ID when available, and
canonical local repository. Keep the selected immutable source revision; for a
new unpinned selection resolve latest main once without switching the checkout.
Use the installed `read-app-map` skill and `loki_capabilities_list`, then
`loki_ui_modeler_get_map` with the exact retained mapId. If no ID was supplied,
start with the selected map index. Check the returned repository and full
revision against the selected local origin and source commit. Map metadata stays
source-attested; this check does not prove runtime behavior or source-transfer
authority. Do not bind an unrelated, stale or simulated map to this application.
Ask only for a genuinely ambiguous selection or missing source identity.

If a supplied genuine bundle is not imported, use the existing hash-bound
`loki_ui_modeler_load_map` contract. Do not search private artifacts, generate a
replacement, replay a provider request or fabricate a map. A failed import/read
remains a blocker for reuse. Preserve an existing simulated Setup record as
simulated; never overwrite it to claim a real result.

## Retain only the needed configuration

Use `loki_context_submit` with kind `notes` to save the selected application,
project ID/host when known, canonical source directory, full source revision,
exact mapId, returned repository/status/limitations, and only the target or
configuration references actually needed by the chosen work. State that this is
retained-map configuration for bounded reads, not a generated ready application
context or an execution grant. Store no credential, source corpus or invented
producer/consumer receipt. Preserve source identity and whether a field is
observed, supplied or unknown.

Use one stable requestKey for identical configuration and keep its original
content on retries. A changed selection uses a new requestKey, with supersedes
when the prior record is known. Read the returned contextId through
`loki_context_get` and compare the saved source/map configuration. Keep this
configuration contextId and exact mapId in the conversation for continuation.
This uses the existing private context store; it creates no new MCP or store.

An `incomplete` map can support a bounded map tour or coverage discussion after
configuration is saved. Do not change its status to ready, complete or passed;
do not resolve/handoff a controlled generation context as proof of real readiness.
Missing producer, target, provider or execution authority matters only when the
selected next action needs it. Reusing an imported map sends no source to a
provider and requires no provider setup or new OAuth flow for local reads.

## Complete onboarding and continue

After readback, confirm the selected application, revision and saved map in one
concise English completion, keeping any incomplete/source-inferred limits. In
the same Setup conversation, read the parent setup skill's next-actions reference
and automatically offer contextual choices when no next goal is selected. The
user must not request suggestions separately. Keep the configuration receipt
with the choice, then use it for the selected or custom goal without restarting
Setup or repeating an answered menu. Revalidate the exact map on reuse; a saved
configuration note is not a live analysis input, browser grant or consumer receipt.
