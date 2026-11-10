# Kaijan for Claude Code

Plan tests, run authorized browser or macOS scenarios, assess supplied evidence,
and read saved reports from the Claude Code CLI or the local Code tab in Claude
Desktop. One package serves both interfaces. It uses the same Product
runtime, managed account connection, Runner, private parameters and bounded
telemetry as the Codex plugin. The first supported platform is **macOS Apple
Silicon**, with **Claude Code 2.1.318 or later**. Desktop runs its own Claude
Code copy; check `/status` in that local session. The global CLI version does
not establish the Desktop version. See the [recorded QA checks](references/host-modes.md#recorded-qa-checks)
for the Desktop workflow and update results, and the remaining verification.
No separate Kaijan Desktop app is needed.

The old `loki-read` package is retired. Remove it through Claude's plugin controls
before enabling Kaijan. Removing that package does not erase old conversations
or revoke its separate read-only Core grant.

## Build and check

Use Node 24 and the repository's pinned pnpm. Build in an isolated checkout:

```sh
pnpm install --frozen-lockfile
node scripts/build.mjs --purpose dev --component claude-plugin --profile qa --platform darwin-arm64 --lane TASK --archive
node scripts/build.mjs --purpose verify --component claude-plugin --profile qa --platform darwin-arm64 --lane TASK --claude /absolute/path/to/claude
```

The build store retains one generation per task lane and reuses verified runtime
inputs. An immutable release also requires `--purpose release --version VERSION`.
The output includes the marketplace, a self-contained plugin ZIP, SHA256SUMS,
file hashes and modes, source identity, install instructions and archive limits.
A release build performs no upload or deployment. Run the installed verifier
against the exact candidate before sharing it.

## Install and connect

Check the release checksums. For a local trial, extract the single-plugin ZIP:

```sh
claude plugin validate /absolute/extracted/kaijan-qa
claude --plugin-dir /absolute/extracted/kaijan-qa
```

The release download includes `.claude-plugin/marketplace.json` and the Core
registration example. Extract the plugin ZIP beside that `.claude-plugin` folder.
For a persistent installation, add this release folder as the marketplace:

```sh
claude plugin marketplace add /absolute/extracted
claude plugin install kaijan-qa@kaijan-claude-qa --scope user
```

For Desktop, open the **Code** tab and choose a **Local** session on the Mac.
Use **+ > Add plugins** (or **Plugins > Manage plugins** in the earlier layout)
to find and enable the same user-scoped plugin. The local CLI and Code tab share
plugin settings. Do not install a second Kaijan plugin or manually configure a
duplicate MCP server. Keep the extracted marketplace source folder available.
Check the session's embedded Claude Code version with `/status`.

Use `/kaijan-qa:setup` (Production: `/kaijan:setup`). Connect your own account,
check the selected workspace, and select your application. Planning needs a work
item or explicit requirements. Running tests also needs the target and authorized
actions. The bundled runtime needs no provider key in the conversation.

In Claude, a request such as “plan tests for this change” can select Kaijan
without naming it. Planning saves proposed checks and leaves execution separate.

Use the normal Claude permission and Stop controls. Saved work stays in its
original Claude session. Resume that session to read it after an update. Separate
Claude sessions and Codex have separate selected context and local records.
Use `scripts/private-parameters.mjs` with the bundled Node and the actual Claude
session UUID for authorized secrets; follow the installed private parameter guide.
Never send secrets in tool arguments or copy another host's credential store.

## Connection prerequisite

The supplied `core-client.json` describes **kaijan-claude-runtime** for Core's
`runtimeClients` configuration (`RUNTIME_CLIENTS_JSON`). It needs `session:read`,
`work-items:read`, `ai:invoke` and `github:credential`. An authorized operator must
register it in the selected environment. This build does not modify that service.
The old direct HTTP `loki-claude` client and existing grants remain separate.

## Reports and telemetry

Both interfaces read the same saved plan, run and assessment format through the
customer report projection. It preserves source attribution and distinguishes
proposed checks from observed outcomes. After a test, Show report displays a
compact saved-result card. **Show details** opens **Kaijan report**, with Tests
and Runs, through Claude's supported mods API. Navigation reads the saved data
already returned in this session. It starts no test, assessment or sign-in.

When the tester supplies an authorized target and complete actions, Claude can
run those steps directly and save the assessment and report. Use planning when
the tester asks for a plan or the scenario needs one.

When a combined test starts from a saved plan, follow its Run ID through
`loki_test_get` for the assessment and report. The standalone Runner reader
provides the execution record.

Keep Claude mods enabled for visual reports. The local Desktop Code host draws
the native pane. Claude's Local adapter advertises a bounded 500,000-character
result allowance for the three saved-report tools. This keeps ordinary larger
reports available to the native pane in the original requested response. It
does not change other tools, permissions, source records or global host settings.
Reports above the host's allowance can still be unavailable in the pane.
Large truncated tool results use one read of the same saved
report through the plugin's existing Local connection. The plugin never reads
Claude's temporary result files. Auto mode can refuse that additional read when
it has no classifier verdict for a plugin-initiated action; keep that refusal
visible and do not claim a pane rendered. An interactive CLI draws the pane beside the transcript in a wide
fullscreen terminal or above the prompt otherwise. `--print`, disabled mods and
unsupported surfaces retain the same structured text report. No browser report
or second plugin is needed. A report read is not a visible-render acknowledgement.
The visual controls and host limits are tracked separately from the earlier
text-report checks in [#3532](https://github.com/katalon-studio/loki/issues/3532).
Follow Claude's update/restart instructions and resume the original session to
read its saved reports; do not replay work to obtain a panel.

Telemetry uses the shared account-bound private outbox and bounded IPC. It records
Claude host attribution, plugin version, runtime startup, tool outcomes, Setup,
planning, execution and assessment events under the existing event contract.
No separate telemetry key is bundled. Existing filtering, retry bounds, duplicate
handling, account rotation and disconnect behavior apply. Do not put customer
text, paths, credentials or session UUIDs into event properties.

## Update and distribution

Use `claude plugin marketplace update kaijan-claude-qa`, then
`claude plugin update kaijan-qa@kaijan-claude-qa` and start/resume the original
session. Verify the responding plugin version. Uninstall with the supported
`claude plugin uninstall` control; use Kaijan disconnect to revoke its account
grant. Keep an installed local marketplace's source directory available.

A reviewed release can be hosted as an HTTPS archive with the generated SHA-256.
`archiveMarketplace(build, url, sha256)` creates the CLI marketplace entry after
the destination is known. Public publication requires its own authority.
The [host mode guide](references/host-modes.md) records CLI/Desktop differences,
install and update controls, native verification steps and the limits of Chat,
Cowork and remote execution. Desktop Code is the first Desktop target; its real
workflow acceptance is separate from portable package checks. Intel Mac, Linux,
Windows and remote execution need separate acceptance.

See the official [plugin reference](https://code.claude.com/docs/en/plugins-reference)
and [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference).
