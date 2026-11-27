---
name: setup
description: Set up Kaijan and save the selected application context. Use for onboarding, setup and connection readiness. Start with a friendly English welcome.
---

# Set up Kaijan

Follow the [shared Product MCP guidance](../../references/local-capabilities.md).

## Start in the current chat

Start first-time Setup with a brief English welcome in your ordinary chat reply.
Use ordinary chat text throughout Setup. Briefly summarize the application or
source and the testing goal already known, so the person can correct them.
Keep the saved summary and any follow-up in chat. Do not open a Setup card,
the legacy onboarding panel or a native Question for Setup.

In Claude, an explicit Setup skill invocation includes connecting Kaijan.
Check `kaijan_connection_get` before asking for a testing goal. If Kaijan is
disconnected or its grant expired, call the available
`kaijan_connection_connect` tool to start browser sign-in. Let the person
complete consent, then verify the connection. Reuse a healthy connection.

If the available Setup tool offers Kaijan Browser, mention it as an optional
part of first-time Setup. When the person chooses to install it, call
`kaijan_app_config_prepare` with only `browserViewer: "install"`. Report whether the
app is ready. If the person only asks to prepare the Viewer, finish that
request without asking for a testing goal or project.

If the testing goal is missing, ask what behavior, change or problem they want
to test. Ask even when the person wants only to set up the application for now.
A short description, test case, ticket or pull request can supply the goal.
Invite an application URL if useful. Ask one focused question in your reply,
then end the turn and wait for the person before saving Setup or choosing tests.
Reuse the reply and the context already supplied. If a consequential choice is ambiguous, confirm it
with the person. A clear selection needs no extra confirmation.

When the person has already chosen a task, continue it through its existing
workflow. Meet the requirements for that action before using a connection,
private sign-in or saved application configuration.

Use the selected project, local directory and saved context. If needed, use the
host project inventory. Resolve a consequential ambiguity with a short question
in chat. Wait for the person's selection before using a different project.

Use the Kaijan connection available to this chat. When the task uses a
selected Git checkout, follow `application-setup` to save the source,
original goal and optional target. Source Setup saves configuration without a
map.

When the person wants to set up a browser or Mac app without selected Git
source and the Local tools are available, use `kaijan_test_inputs_read` to find
its saved application and Test Environment. Reuse matching records. If needed,
save the application with `kaijan_aut_manage` and its target with
`kaijan_test_environment_manage`. Follow the `configurations` skill for the saved target.
For an explicit Plan request, follow the `plan-tests` skill with the original
task and saved environment. Continue the user's task when its own
prerequisites are met.

When the person asks only for a summary, skip reconciliation or any new save.
For saved application and environment settings without Git source, read them
with `kaijan_test_inputs_read` and summarize those records in chat. For saved
source context, find the selected Setup with `kaijan_app_config_list`. For a
ready Setup, use `kaijan_app_config_resolve` with its saved source and
target-profile revisions. Summarize the saved application and goal in ordinary
chat. If Setup is pending or blocked, state that status and the specific next
step when known.

## Check the connection for the selected action

Check the chat's actual tool inventory and `kaijan_capabilities_list` when
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
- Use `kaijan_connection_get` to verify the live Kaijan account and workspace.
  On an explicit disconnect request, use `kaijan_connection_disconnect` through the host.
  Verify the new connection after sign-in before starting dependent work.
- If tools are missing after an update or the responding build is uncertain,
  follow [update recovery](references/update-recovery.md). Check callable tools
  and action readiness before new paid work. If the task requires a specific
  build, verify that it responds in this chat. Preserve admitted Runs and saved
  results.

After saving, summarize the application or source and the testing goal in a
short ordinary reply. If saving failed, state the concrete blocker. When the
person already chose what to do, continue that work under its existing rules.
When a next step would help, use [next-action discovery](references/next-actions.md)
to suggest it in the same reply. Respect a request to stop or skip suggestions.
