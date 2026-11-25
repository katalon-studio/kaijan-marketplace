---
name: configurations
description: Manage personal Kaijan Configurations through MCP for reusable application URLs and other key–value settings. Use when the person asks to find, save, select or remove test settings.
---

# Personal Configurations

Each Configuration is a Test Environment. Use
`kaijan_test_inputs_read` with `autId` to find environments or
`testEnvironmentId` to read one. Use `kaijan_test_environment_manage` for saves and
deletes. When saving, supply the selected AUT ID and the browser
`target.initialURL` or the Mac app's bundle identifier in `target.app`.
Before saving a Mac environment, follow the
[macOS target guide](../run-test/references/macos-appium-setup.md#check-xcode-and-the-target)
to find the bundle identifier for the selected app. Ask for the identifier
if you cannot verify it.

Give Plan the saved environment ID. For a first Plan without a linked Test Environment,
save one for the selected AUT and, if it needs sign-in, use the local
Configuration save command with that AUT ID.

Use an exact saved ID when the person asks to edit a Test Environment. If
several match, ask which one. Saving settings never starts a test.

Configurations belong to the local person and selected Kaijan environment.
They remain available across chats and restarts on this device. They are not
shared with the team or copied between QA and Production.

When the person chooses to save a new or changed app login from a local
environment file, use the [Configuration save command](../../references/private-parameters.md#save-an-app-login-to-test-environment-config).
Save before starting Plan or Run. Keep raw secrets out of chat and tool arguments.

The person can save any key names. Keep their existing names and types. To
edit ordinary values, supply the saved ID and latest revision. A new Test
Environment uses a fresh UUID and revision `0`. The person supplies or
approves the values. Read the current revision after a conflict. Delete only
when requested, using the saved revision.

Keep the original request key and input after an uncertain reply. The original
Plan retains its selected settings, and Run reads them from the saved Plan.
Read the original answer before retrying. Ask only for missing, changed or
rejected values. Never treat a login failure as permission to replace the saved
account or replay actions with uncertain effects.
