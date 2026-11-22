# Claude host modes

One Kaijan plugin serves the Claude Code CLI and the **local Code tab** in
Claude Desktop on macOS Apple Silicon. Both use the bundled native runtime,
stdio Core/Local servers and the same managed Claude client. The normal package
and the fixed-QA variant have the same nine skills as Claude Code. Both use the
shared Setup flow in chat. Prior installations keep their original skill
inventory until updated.
Desktop Code is the first Desktop target. A recorded QA trial completed the
workflow in local Code and reopened the saved report after an update. See the
[recorded QA checks](#recorded-qa-checks) for the versions and limits.

## Run in the local Code tab

1. Add the public Git marketplace and install `kaijan@kaijan-claude` at user
   scope with the CLI commands in `README.md`. The catalog installs a Git subdirectory pinned to a release commit. A local extracted marketplace remains a supported development route.
2. Select QA or Production before starting the local Code engine. For persistent
   QA, merge `"env": { "KAIJAN_PROFILE": "qa" }` into
   `~/.claude/settings.json`, or `.claude/settings.local.json` for one project.
   Preserve other settings and check project overrides. A temporary CLI shell
   assignment does not configure an already-running Desktop engine.
3. In Claude Desktop, open **Code** and select a **Local** session on this Mac.
   Use **+ > Add plugins**, or **Plugins > Manage plugins** in the earlier layout,
   to enable Kaijan. Organization policy can restrict local plugins.
4. Run `/status` and record the **Claude Code** version. It must be 2.1.318 or
   later. Desktop updates its own copy; a global CLI update does not update it.
   If needed, use **Claude > Check for Updates…**, then start a new session.
5. Use `/kaijan:setup` for either selected profile. Read connection
   status before connecting. Claude account access and the Kaijan grant are
   separate. Do not copy a Claude Code or CLI credential into Desktop.

Open Setup yourself in either host. If the session already has a Kaijan grant,
reuse it. During work that needs managed access, Kaijan can open browser sign-in
when that grant is missing, expired or revoked.

After an update, follow Claude's restart instructions and resume the original
Code session to reopen its saved reports. In the recorded Code2.1.317 control,
reloading an older session that had never loaded a mod did not activate its new
report UI. A fresh engine loaded it; later reloads refreshed the existing mod.
Do not move or replay saved work to obtain a panel. The package's supported
Code version remains2.1.318 or later.

Kaijan binds execution and selected context to the UUID supplied by Claude to
its MCP process. Resume the originating session to execute its selected saved
Plan or continue its Run. Merely switching interfaces does not transfer that
execution context.

Supported read-only project history can list and read associated Plans, Runs
and reports from another conversation in the same project, and open the saved
native report without a new producer. The [recorded Desktop history check](https://github.com/katalon-studio/loki/issues/5377#issuecomment-6872291837)
does this; its first native-open refusal remains an incorrect original answer.
Older work absent from project history may need association from its original
chat. If the original data or authorized history is unavailable, report that
specific limit. Do not invent IDs, transfer namespaces or replay a test to
recreate a report.
The native report card and Tests/Runs pane use the validated saved report.
Review notes, test groups, prerequisites, outcomes and Executed steps retain
their original content. Opening, expanding and switching tabs do not plan,
execute or assess. On resume, a truncated reader row may request its same report
ID once through the bound Local reader. A failed or refused read keeps the
host's original textual output; it does not invent a replacement report.
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
| Reports            | Inline card with mods; details open in the default browser. `--print` is text. | Inline card; **Open Kaijan report** opens HTML in the Browser pane.              |
| Records            | Bound to the actual Claude session                                             | Same binding rule; no automatic cross-session report transfer                    |
| Telemetry          | Lifecycle host `claude_code`; MCP host follows its actual handshake            | Same contract; no asserted Code-tab surface field                                |

In Desktop, select **Show details** to get the **Open Kaijan report** link.

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

### Historical TodoMVC newcomer demo

The explicitly invoked demo passed on 10 November using private QA packages:
Claude Code CLI 2.1.321 and Desktop 4.23118.1 with embedded Code 2.1.321.
Each `/kaijan-qa:demo` invocation saved one Plan, ran its selected case against
the online React example and returned a Passed assessment and saved report.
Desktop details reopened normally; the CLI returned the exact report and six
executed steps on a read-only follow-up. Neither reopening repeated planning,
execution or assessment. Separate Desktop explanation-only and plan-only
requests started no Run. See [the demo evidence and limits](https://github.com/katalon-studio/loki/issues/4540#issuecomment-6764958597).

These checks establish the private QA flows, not public distribution, a new
Stop/fault trial, full app-restart recovery or other Claude surfaces. The first
CLI sign-in failure remains recorded; after the person's Keychain-ready handoff,
normal sign-in succeeded without copying credentials or changing account grants.

### Isolated rc.192 active Stop

On 14 November, Desktop 5.11492.5 / embedded Code 2.1.325 loaded the matching
rc.192 repair in a dedicated Local QA session. One native Stop press during an
active normal TestRun triggered Stop on that same Run. The worker exited with
no later browser actions, and its saved native report reopened as **Stopped
at your request / Result unavailable**, with assessment stopped. The Clear
completed application check remained incomplete.

The [independent bounded Pass](https://github.com/katalon-studio/loki/issues/5391#issuecomment-6876445556)
preserves the original failures and timing miss. It establishes forwarding and
retained reporting in this configuration, not cancellation latency or ordinary
company rc.175 recovery. The earlier failed engine's exact mod owner remains
unproved. See the [original chronology and limits](https://github.com/katalon-studio/loki/issues/5391#issuecomment-6876403027).

## Identify a private Desktop candidate

CLI installation/selection and responding MCP versions do not establish which
mod a Desktop engine loaded. In the earlier QA epoch, Core/Local used rc.192
while the registered same-named mod lacked its new turn handlers. A later
receiving check temporarily turned off the two existing personal upload/company
rc.175 entries through normal UI. Only the intended rc.192 hook root then
registered `turn.start` and `turn.complete`, and the service confirmed QA.
Both switches were restored ON; the company package and policy did not change.
This records the test configuration, not a requirement for ordinary use.

For private-candidate qualification, record the actual loaded generation and
responding environment before attributing a result to it. Preserve ambiguous
first outcomes and original saved work; a later reload or replay does not prove
the earlier engine's identity.

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
