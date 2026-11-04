# Provider access on a new machine

The native package needs an approved OpenAI API key for Runner and OpenAI analysis. A Codex subscription does not supply that key. The managed package uses Kaijan sign-in instead. Read `loki-build.json`; `authArchitecture: shared-broker-v1` selects the managed route. Do not switch routes or copy another user's credentials to hide a missing setup step.

Use the installed plugin folder, not a source checkout or a remembered cache version. The package includes Node. From that folder, inspect configuration without making a provider call:

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

Configured means settings are present. It does not prove the key is valid, has credit, or can use the selected model. Continue the user's authorized task to check that route. Report the actual provider error if it fails. If no approved key or managed connection exists, explain once: “Kaijan needs API access before it can run this test.” Keep useful Setup and saved-report work moving.
