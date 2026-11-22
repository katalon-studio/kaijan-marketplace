# Kaijan connection

## Managed sign-in

This package uses managed Kaijan sign-in. Claude Code's own sign-in remains
with Claude. Do not configure provider keys, change models, copy another
client's token or use the retired direct Work Item plugin to bypass a failure.

When the selected action needs managed access, read `loki_connection_status`
for the intended account, workspace and permission. Reuse a valid connection.
If the connection is missing, expired or revoked, call `kaijan_connect` and
let the user complete browser sign-in and consent. Read status again before
continuing the task. Cancellation does not authorize another attempt.
Source-only Setup and saved-result reads can continue when their Local tools
are available.

The service must register the packaged `kaijan-claude-runtime` client and its
listed scopes. The build's `core-client.json` is an operator example, not proof
of a deployment. An unknown client or denied scope needs operator resolution;
do not substitute the Codex client identity or broaden its grant.

Use `loki_disconnect` only at the user's request. It revokes this Claude grant;
it does not delete reports or disconnect the Codex plugin.
