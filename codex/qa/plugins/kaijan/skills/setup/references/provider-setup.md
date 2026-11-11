# AI access on a new machine

Read `loki-build.json` in the installed plugin folder. Normal packages use managed sign-in, identified by `authArchitecture: shared-broker-v1`. The key instructions below apply only when the installed package is confirmed to be an explicit direct-development build.

## Managed sign-in

Managed analysis, planning, Runner and evidence assessment use the Kaijan sign-in grant through Core. The managed provider does not read local API keys. Source-only Setup, context retention and saved-result reads can continue when their Local tools are available, even if AI access is missing.

When a selected action needs AI, check `loki_connection_status` for the intended account, workspace and `ai:invoke` permission. If the connection is missing, expired or revoked, use the installed `kaijan_connect` tool when available and let the user complete browser sign-in and consent. Check the connection and the selected Local capability again. If the tool itself is missing, use [update recovery](update-recovery.md). GitHub repository access and application login each have their own checks.

A connected grant, a configured provider and a successful model-list read are separate observations. Verify inference only through the authorized action. Preserve the original records and request keys during recovery.

## Managed sign-in recovery

If Kaijan cannot use the sign-in service that is already running (`broker_restart_required`), wait for Kaijan work in all chats that use the affected plugin profile to finish. This includes sign-in, analysis and test runs. Stop here if you cannot confirm those chats are idle. Turning the plugin off and on alone does not stop the older service.

From the installed plugin folder for that profile, run the bundled connection command:

```sh
./capabilities/runtime/node ./scripts/connection.mjs stop
```

After the command reports `stopped`, follow [Recover in the same chat](update-recovery.md#recover-in-the-same-chat). Check both Kaijan connection status and local tool availability before reopening the saved work. The stop command keeps your sign-in and saved work.

## Direct-development provider key

A confirmed direct-development build needs an approved OpenAI API key for Runner and OpenAI analysis. Use the installed plugin folder and its bundled Node to inspect configuration without making a provider call:

```sh
./capabilities/runtime/node ./scripts/provider-settings.mjs show
```

If the user has approved an existing local `.env` file for this plugin, import it once:

```sh
./capabilities/runtime/node ./scripts/provider-settings.mjs configure --from-file /absolute/path/to/approved.env
```

The file must contain `OPENAI_API_KEY`. It may also contain `LOKI_OPENROUTER_API_KEY` or `OPENROUTER_API_KEY` for JEV. Ordinary OpenAI work does not require the JEV key. Only provider fields are saved. The command parses the file as data; it does not run shell commands from it. Do not print the file, put secrets in command arguments, or write it into the plugin archive. A source checkout is not required.

`configure` without `--from-file` saves the command's inherited provider environment. This is useful when an operator has already set the key in a terminal. Both forms write the selected package's private profile. They do not change Codex settings, models or app credentials. `LOKI_CODEX_STATE_DIR`, or an explicit `--state` absolute path, must match the MCP host if it uses a custom state directory. Otherwise use the default.

Check `show`, then the selected MCP tool's readiness. Saved keys are read for new operations without a rebuild or reconnect. An inherited host key overrides the saved key; if that inherited key is wrong, correct the host environment and reconnect through supported host controls. Do not replay an operation whose effects are unknown.

Configured means settings are present. It does not prove the key is valid, has credit, or can use the selected model. Continue the user's authorized task to check that route. Report the actual provider error if it fails. If no approved key exists for this direct build, explain once: “Kaijan needs API access before it can run this test.” Keep useful Setup and saved-report work moving.
