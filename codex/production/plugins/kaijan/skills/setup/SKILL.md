---
name: setup
description: Set up Kaijan and save the selected application context. Use for onboarding, setup and connection readiness. Introduce this as Kaijan setup with a friendly English welcome.
---

# Set up Kaijan

Read the [shared Product MCP guidance](../../references/local-capabilities.md). Use simple English. Start with a short welcome such as “Welcome to Kaijan! Let's get your application ready so you can start testing.” Adapt it to the known application and goal. Do not repeat it on resume or narrate internal skills and tools.

## Select the application and goal

Reuse the current project, explicit selection and saved context. When needed, use the host's supported `list_projects` inventory. Match the actual project label and local directory. Ask which application only when the selection is missing or ambiguous. Do not scan the machine or choose by recency. If the host inventory is unavailable, use an explicit directory or ask for it; do not claim a search occurred.

Use a native Question for consequential missing input. A highlighted or unanswered choice authorizes nothing. Never change approval mode to show a Question. If the original request already selects a complete test/report goal, continue through `test-request` when its inputs suffice; do not add a phase choice.

## Save application context without a map

Resolve the installed plugin root two directories above this skill. Read its `loki-build.json` and use that profile's installed tools and skills. For application configuration, follow `application-setup` in this same conversation. Save the source selection, original goal and optional target, then read the original result.

This release does not build maps. Do not call a map tool, ask for mapping credentials, require map readiness, wait for generation or fabricate a ready map. Fresh Setup sends no source to a model. It returns a saved configuration with `map: null`; this is not browser observation or proof that a feature works.

For a new source selection, default to latest main and honor an explicit branch, PR ref or exact commit. Keep the frozen SHA and original requestKey for readback/recovery. Setup does not include dirty files in that committed-source selection. Keep the caller's actual dirty-source evidence separate when the selected test task needs it. Ask for a target/browser only when execution needs one.

Use the advertised input/output schema, `isError` and `structuredContent`. Preserve actual safe failures, missing input and unknown historical effects. Old mapping contexts remain old records and are never automatically restarted. A saved application context does not grant provider, browser or write authority.

## Connections and prerequisites

Read `authArchitecture` in the installed `loki-build.json`. With `shared-broker-v1`, Core and Local use the same Kaijan sign-in. Managed analysis, planning, Runner and evidence assessment need the shared grant for AI. Source-only Setup, context retention and saved-result reads do not need AI access when Local tools are available. An explicit direct-development build uses its local provider settings for AI.

Inspect the actual chat tool inventory and `loki_capabilities_list` when exposed. Distinguish installed/enabled, discovery, current-chat availability and selected-operation readiness. Report the exact missing boundary. Use a supported reconnect control only when needed and verify afterward. Do not infer that Core login will fix missing local tools.

After an update, or when the installed instructions require tools that this chat
does not have, read [update recovery](references/update-recovery.md). Check the
responding package before new paid work. Preserve active work and saved results;
do not repeat a test to repair its connection or report.

Check the prerequisites for the action the user selected. Application login is separate from Kaijan sign-in. Use the installed `work-item` skill when the user needs a Kaijan Work Item. Keep Work Item creation outside onboarding. For GitHub work, read [GitHub setup and recovery](references/github-setup.md).

When a selected action needs AI, follow [AI access and sign-in recovery](references/provider-setup.md) for the installed mode. For managed builds, check the Kaijan connection and use the supported sign-in flow if access is missing. Use key setup only for a confirmed direct-development build. A Codex subscription does not establish Kaijan AI access.

## Finish and continue

Verify the saved configuration or blocker through `application-setup` in this conversation. State it once and continue the user's explicit task when its inputs and authority suffice. Risk analysis, functional/change-impact planning and Runner do not require a map or a Setup handoff.

If the next action is open, read [next-action discovery](references/next-actions.md) and show a small set of relevant capability actions with their reason, expected result and actual requirements through a native Question. Do not substitute a fixed menu, generic chat navigation or “I'll wait” for that choice. A plan-only or no-execution request still allows useful suggestions. An explicit request to stop or skip suggestions takes precedence. Preserve the accepted selection instead of asking again.

Keep configuration, proposed tests, actual execution and separate evidence assessment distinct. Do not claim a pass from a handle, finished call, source inference or missing evidence. No watcher, extra daemon, idle-chat wake or cloud orchestration is introduced.
