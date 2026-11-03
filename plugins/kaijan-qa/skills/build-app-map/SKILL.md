---
name: build-app-map
description: Build or extend source-derived UI map fragments relevant to a current work item from an explicit local code folder. Use for fresh source mapping; not runtime execution.
---

# Build a work-item map fragment

Read the [shared Product MCP instructions](../../references/local-capabilities.md).

Use `loki_ui_modeler_build_map` with the user's explicit authorized absolute
`folder` and current `workItem` description or question. Plain folders and dirty
working trees are supported. No Git commit, GitHub login, Setup context or
prebuilt map is required. Optional changed files, diff and known entry points are
caller context, not an implementation oracle. Do not invent application-specific
hints or paste the repository into the prompt.

The normal awaited query captures current source for immutable binding and
freshness. JEV first screens paths and the current question without source text;
its uncertain and lower-scored paths remain eligible. Luna then reads promising
source and follows material connections before generating that fragment. Fixed Luna medium and native
JEV retain their own calls and receipts. The default native guard is $10 known/
reserved and 5400 seconds over capture, discovery and assembly. Source goes to
the configured provider under the caller's existing authorization; private
artifacts retain originals. Lower limits are available.

After a successful build, use the exact returned `mapId` with
`loki_ui_modeler_show_map` to show the source-derived graph. UI is enabled by
default. If the tool returns map data without a UI component or preview, present
it in chat as a Mermaid diagram or readable table using the returned pages,
elements and source links. Do not invent a preview when UI is disabled.
Building memoizes an immutable answer without changing
the caller's selected map. Preserve included scope, exact source references,
unexplored connections, partials and known/unknown cost. Source inference is not
runtime evidence or complete-app coverage. Later questions may reuse valid
analysis and add another fragment; do not silently merge incompatible snapshots.

Repeat unchanged inputs to reuse valid analysis. The current inventory is always
rechecked. A request key only correlates the original exact reply after loss; it
does not request freshness. For new analysis, omit it or use a fresh UUID.
On request_key_conflict no new analysis ran; use its supplied fresh key for new
work. A distinct attempt after provider failure may incur another charge; retain
the original receipt. Host cancellation stops caller-owned execution; in-flight
provider fees can remain unknown.

If the host truncates the completed answer, follow `resultRead` using
`loki_advisory_result_read` with `family: "uiModeler"` and ordered offsets. This
reads a completed answer and never starts or polls computation.
