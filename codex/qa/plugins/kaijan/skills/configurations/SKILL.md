---
name: configurations
description: Manage personal Kaijan Configurations through MCP for reusable application URLs and other key–value settings. Use when the person asks to find, save, select or remove test settings.
---

# Personal Configurations

Use `kaijan_configuration` to list, read, save, select or delete settings. Pass
the website the person gave as `application` to find its saved set. Use an
exact saved ID when the person asks to edit that set. If several sets match,
ask which one. Saving settings never starts a test.

Configurations belong to the local person and selected Kaijan environment.
They remain available across chats and restarts on this device. They are not
shared with the team or copied between QA and Production.

Configuration is optional and supports completing tests. The person chooses
whether to save settings. Reuse one matching application configuration
automatically; do not require another selection before each Run. Ask which one
to use when several match. Without appropriate saved settings, continue the
normal test flow. Use `operation: "list"` before asking the person to repeat
settings that may already be saved.
Supply the known application URL to find its configurations. Read an exact ID
when needed. Ordinary entries contain their typed values. A secret entry
contains availability and a reference. Keep raw secrets out of chat and tool
arguments. Use the [private login path](../../references/private-parameters.md)
or manual login for a new or changed secret needed for a Run. Configuration
remains optional.

The person can save any key names. Do not require a fixed URL, username or
password schema. Keep their existing names and types. For agent edits, `save`
updates only the supplied ordinary `values`. Retain `id` and `revision` from the
latest read. A new configuration uses a fresh UUID and revision `0`. The
person supplies or approves the values. A conflict requires a fresh read, not
an automatic overwrite. Delete only when requested, using the saved revision.

Use `operation: "select", id` when the person chooses a particular
configuration for this chat. Use
`id: null` when the person wants no saved configuration. Explain the selected
name before an authorized Run. Ask which to use if several match the same
application. Use `operation: "select", automatic: true` to return to automatic
matching. Keep the selected target and account clear.

The existing Run tools use one matching application configuration automatically.
An explicit chat selection takes precedence. Runs
without an appropriate configuration keep their normal path. Configuration adds no report content or schema.
An explicit `configurationId` selects one configuration for that Run; `null`
uses none. Ordinary `params` and existing scoped `privateParams` references
can override saved defaults for one Run. A configuration does not authorize Run.
Follow [Run](../run-test/SKILL.md) for the person's execution scope.

Keep the original request key and input after an uncertain reply. The original
Run retains its selected revision even if the person edits or deletes the
configuration. Read that Run instead of creating a replacement. Ask only for
missing, changed or rejected values. Never treat a login failure as permission
to replace the saved account or replay actions with uncertain effects.
