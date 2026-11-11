---
name: setup
description: Set up Kaijan and save the selected application context. Use for onboarding, setup and connection readiness. Start with a friendly English welcome.
---

# Set up Kaijan

Follow the [shared Product MCP guidance](../../references/local-capabilities.md).
On first Setup, welcome the user briefly in English. Use the selected project,
local directory and saved context. If needed, use the host project inventory.
Ask a native Question only when a consequential selection is missing or
ambiguous. A suggestion or unanswered Question does not select a project.

Use the profile in the installed `loki-build.json` and follow
`application-setup` in this conversation to save the selected source, original
goal and optional target. Setup returns saved configuration without a map.
Continue the user's explicit task when its own prerequisites are met.

## Check the connection for the selected action

Check the chat's actual tool inventory and `loki_capabilities_list` when
available. Distinguish installation, current-chat tool availability and
readiness for the selected operation.

- With `shared-broker-v1`, Core and Local share the Kaijan sign-in. Managed
  AI work needs its grant. Source-only Setup, retained context and saved
  reads can work without AI access when Local tools are available. If the
  user cancels sign-in and wants source-only Setup, continue on that basis.
  Use [AI access and sign-in recovery](references/provider-setup.md) for
  managed sign-in or confirmed direct-development provider setup.
- Check target login and private GitHub access separately. Follow
  [GitHub setup and recovery](references/github-setup.md) for GitHub work.
  Use `work-item` for an existing Kaijan Work Item.
- If tools are missing after an update or the responding build is uncertain,
  follow [update recovery](references/update-recovery.md). Check callable tools
  and action readiness before new paid work. If the task requires a specific
  build, verify that it responds in this chat. Preserve admitted Runs and saved
  results.

State the saved configuration or concrete blocker. If the next action is
open, use [next-action discovery](references/next-actions.md) to offer a
small set of relevant actions through a native Question. Keep any selection
already made and respect a request to stop or skip suggestions.
