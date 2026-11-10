# Claude host modes

One Kaijan plugin serves the Claude Code CLI and the **local Code tab** in
Claude Desktop on macOS Apple Silicon. Both use the bundled native runtime,
stdio Core/Local servers, the same managed Claude client and eight skills.
Desktop Code is the first Desktop target. A recorded QA trial completed the
workflow in local Code and reopened the saved report after an update. See the
[recorded QA checks](#recorded-qa-checks) for the versions and limits.

## Run in the local Code tab

1. Verify the release checksums and extract the supplied plugin ZIP beside its
   `.claude-plugin` marketplace folder. Keep that source folder while installed.
2. Install that marketplace and plugin at user scope with the CLI commands in
   `README.md`. This is the same installation used by the local Code tab.
3. In Claude Desktop, open **Code** and select a **Local** session on this Mac.
   Use **+ > Add plugins**, or **Plugins > Manage plugins** in the earlier layout,
   to enable Kaijan. Organization policy can restrict local plugins.
4. Run `/status` and record the **Claude Code** version. It must be 2.1.318 or
   later. Desktop updates its own copy; a global CLI update does not update it.
   If needed, use **Claude > Check for Updates…**, then start a new session.
5. Use `/kaijan-qa:setup` for QA or `/kaijan:setup` for Production. Read connection
   status before connecting. Claude account access and the Kaijan grant are
   separate. Do not copy a Claude Code or CLI credential into Desktop.

After an update, follow Claude's restart instructions and resume the original
Code session to reopen its saved reports. In the recorded Code2.1.317 control,
reloading an older session that had never loaded a mod did not activate its new
report UI. A fresh engine loaded it; later reloads refreshed the existing mod.
Do not move or replay saved work to obtain a panel. The package's supported
Code version remains2.1.318 or later.

Resume the original Claude session to read its saved work. Kaijan binds local
records to the UUID supplied by Claude to its MCP process. Merely switching
interfaces does not select another session or move its reports. If the original
session is unavailable, report that limit; do not replay a test to recreate it.
There is a known platform limit: Claude documents that a stdio MCP process keeps
its startup session ID across `/clear`, and `--continue` or `--resume` without an
explicit ID can supply the initial startup ID. Kaijan currently uses that host
value. These transitions are not accepted as isolated Kaijan sessions. Start a
new Claude process/session for new work; for a CLI resume, supply the explicit
original session ID. Native checks must establish the Desktop equivalent before
we claim saved-record isolation across clear/resume. Do not replay work or
invent a replacement ID to bypass this limit.

## Differences and limits

| Area               | CLI                                                                            | Local Desktop Code                                                               |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Install and update | `claude plugin` controls                                                       | Same local plugin settings; plugin manager UI is also available                  |
| Host version       | Global `claude --version`                                                      | Embedded Claude Code row in `/status`; record the Desktop app version separately |
| Interaction        | Terminal; optional `--print` automation                                        | Code conversation and native permission controls                                 |
| Kaijan tests       | Same managed runtime, planning, authorized Runner and saved assessment methods | Same package and methods; three TodoMVC QA workflows observed                    |
| Reports            | Native saved-result card and pane when mods are enabled; `--print` uses text   | Same card; Show details opens Claude's native Kaijan report pane                 |
| Records            | Bound to the actual Claude session                                             | Same binding rule; no automatic cross-session report transfer                    |
| Telemetry          | Lifecycle host `claude_code`; MCP host follows its actual handshake            | Same contract; no asserted Code-tab surface field                                |

The existing contract leaves `host_surface` unknown. Do not infer Desktop or CLI
from a path, client name, prompt or environment guess. A text report read never
emits a native panel-render acknowledgement. Authorized saved trace viewing
retains its existing separate local viewer and close controls.

Other Claude surfaces have different platform capabilities:

- **Chat:** plugin skills can be available, but plugin-bundled local MCP servers
  do not run there. This package cannot provide full Kaijan testing in Chat.
- **Local Cowork:** its plugin MCP servers can run on the Mac even though shell
  execution uses a Linux VM. Do not assume the native runtime runs in that VM.
  Kaijan's required session binding and full workflow have not been verified
  there; do not substitute a fabricated session UUID.
- **Cloud Cowork and cloud Code:** local plugin servers are not available in
  cloud sessions. This local macOS package does not provide a remote runtime.
- **SSH Code:** plugins can run on the remote host, whose OS and credentials
  differ. This macOS ARM64 package has no remote-host acceptance.

## Recorded QA checks

Global Claude Code 2.1.318 and Claude Desktop 4.23118.0 with embedded Code
2.1.317 used the same Kaijan QA plugin. In local Code, a read-only task produced
a plan, ran the selected check, returned an inconclusive assessment and reopened
the saved report. After updating to the same
[shared QA build](https://github.com/katalon-studio/loki/actions/runs/42173988111),
both hosts reopened their own saved reports. The original results stayed intact.
See the [workflow record](https://github.com/katalon-studio/loki/issues/3428#issuecomment-6678595208)
and the [update check](https://github.com/katalon-studio/loki/issues/3428#issuecomment-6679073924).

On 10 November, the human selected keeping Desktop 4.23118.0 and embedded Code
2.1.317 for the three-case follow-up. The original caller prompts checked TodoMVC
filter states, Enter/Escape editing, and Clear completed preserving active rows.
All three produced Passed assessments and saved reports, and their original
results were inspected in the native report pane. Their first outcomes and
evidence qualifications remain on [#3428](https://github.com/katalon-studio/loki/issues/3428).
The final Clear completed report retains its partial work-item coverage; no
linked work item was supplied.

The editing report exposed a size boundary: its 54,941-character response was
persisted by Claude before the mod could parse it. Auto mode refused the mod's
additional same-report read because that action had no classifier verdict.
The Claude-only Local adapter now advertises the client's bounded larger result
allowance on Show/Open/Get. The original editing report then opened in full,
without replaying its Run or assessment. A fresh Clear completed workflow used
that repaired package and opened its own native report. No host permission or
global size setting changed. The Claude Code plugin and publication remain separate.

These trials establish the selected older Desktop's observed compatibility.
The declared 2.1.318 package minimum is unchanged. A newer embedded Desktop
version, Stop and session isolation across clear/resume remain unverified by
this three-case check.

## Verify a candidate in both hosts

Complete the CLI check first, then the local Code-tab check with the same
candidate and an authorized bounded task. Record the plugin source/version,
both host versions, actual tools, session identity binding, connection state,
Plan/Run/report IDs, Stop/cleanup outcome and QA telemetry. Reopen the original
saved report after a normal update without executing or assessing it again.
Check separate sessions, explicit resume and clear-context boundaries. Keep the
originals and account permissions unchanged. A missing host session UUID must
fail with an actionable message, not fall back to a shared record store.

Use Claude's own sign-in controls if its account is not connected. Read the
existing Kaijan connection status before starting a separate managed connection.
If Claude reports a Keychain error, use macOS's own unlock controls. Never copy
credentials between CLI and Desktop. This guide does not authorize a new grant,
public publication or deployment. Report tested behavior separately from platform
documentation.

## Platform sources

Checked 6 November 2026:

- [Claude Code Desktop: plugins and embedded version](https://code.claude.com/docs/en/desktop)
- [Plugin behavior in Chat, Cowork and Claude Code](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)
- [Cowork local and cloud architecture](https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview)
- [Claude Code session environment](https://code.claude.com/docs/en/env-vars)
