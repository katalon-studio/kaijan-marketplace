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
node scripts/build.mjs --purpose dev --component claude-plugin --profile production --platform darwin-arm64 --lane TASK --archive
node scripts/build.mjs --purpose verify --component claude-plugin --profile production --platform darwin-arm64 --lane TASK --claude /absolute/path/to/claude
```

The build store retains one generation per task lane and reuses verified runtime
inputs. An immutable release also requires `--purpose release --version VERSION`.
The output includes the marketplace, a self-contained plugin ZIP, SHA256SUMS,
file hashes and modes, source identity, install instructions and archive limits.
A release build performs no upload or deployment. Run the installed verifier
against the exact candidate before sharing it.

### Package profiles and skills

The normal `--profile production` package is `kaijan`. Its eight common skills
match Codex: setup, plan-tests, review-report, run-test, test-request,
configurations, application-setup and report-feedback. Set `KAIJAN_PROFILE=qa`
for internal checks with normal
Kaijan. QA and Production retain separate accounts and saved work. The optional
`--profile qa` build is fixed to QA and uses the `kaijan-qa` namespace.
Use only the intended variant in a session. Actual service verification uses
QA while the Claude Production client registration is disabled.

The installed verifier uses a disposable home/configuration and runs Claude's
package-management commands with `--bare`, which skips account Keychain reads.
Native validation, file/mode checks, Core/Local SDK calls, update and uninstall
remain active. This does not sign in to Claude or replace interactive CLI/Desktop
acceptance. Its receipt records `hostMode: "bare"`.

For a Git-subdir receiving check, keep the original candidate as the expected
byte inventory and pass a separate local marketplace with one uniquely matching entry that
names the selected plugin, a `git-subdir` source and the exact 40-character payload
commit:

```sh
node apps/claude-plugin/scripts/verify-installed.mjs \
  --candidate /absolute/candidate/distribution \
  --install-marketplace /absolute/local-git-marketplace \
  --runtime-profile qa --output /absolute/fresh-receipt \
  --claude /absolute/path/to/claude
```

This uses the real CLI's strict validation, install, update and uninstall in a
disposable home. Every shipped file still matches its original hash and
executable mode. Claude can also create `.mcpb-cache` while installing a Git
source. The verifier checks that cache's source binding and every member
against the independently verified original MCPB; it does not ignore that
directory. The receipt separates shipped files from generated cache files and
records the selected Git path/commit. A local Git check does not establish
public GitHub delivery, interactive host acceptance or official directory
listing. Actual service testing remains QA while Production Claude client
registration is disabled.

### Bundled runtime transport

Claude builds keep Node.js and GitHub CLI bundled. The installed
`capabilities/runtime/node` is a small signed macOS launcher; `node.gz` holds
the exact prepared, pinned Node binary. No employee-installed Node or GitHub
CLI, runtime download, feature removal or account action is needed to launch it.
The launcher retains the pinned Node's macOS 13.5 deployment floor; this does
not claim an execution check on an older Mac.
This is a Claude-only physical packaging change. The shared/Codex payload and
its installed-library verification stay unchanged.

On first launch, the launcher restores Node, GitHub CLI and their licenses into
a private generation under
`~/.local/share/loki/claude_code/runtime-binaries/`. It checks exact hashes,
lengths, ownership, modes and file types, then publishes the generation
atomically. Concurrent preparation uses separate staging directories. A corrupt
existing generation is refused rather than overwritten. Normal termination
during preparation removes that process's staging; abrupt uncatchable
termination may leave staging for later owned cleanup. It never sweeps another
process's staging or an existing generation.

The launcher executes the restored Node with the original PID, arguments,
exit/signal behavior and caller's file-creation mask. `process.execPath` points
to that persistent Node, with bundled `gh` beside it, so children and brokers
keep working after the original Claude process exits. Do not remove a generation
while any process still uses it. Updating or uninstalling the plugin does not
implicitly delete this runtime cache, saved records or account grants.

`NODE_BUILD.json` retains the original prepared Node's version/hash/signing
provenance. `NODE_TRANSPORT.json` separately identifies the launcher, compressed
member and restored members. The physical payload manifest/digest covers the
new installed bytes; it does not label the launcher as the original Node.

Compression reduces **upload extraction**, not the total installed footprint.
Retain the installed compressed tree plus the restored generation; unique
concurrent staging can temporarily add a generation per preparing process.
Use the actual archive and transport receipts for each candidate's sizes. The
earlier rc.121 archive expanded to 241,392,222 bytes and was refused by the
company uploader. The successful smaller candidate, actual organization policy
and installation receipts are on [#5175](https://github.com/katalon-studio/loki/issues/5175#issuecomment-6869759374).

### Company-directory dependency transport

The rc.168 archive met the size limit but the actual uploader refused its
dependency paths. Company uploads exclude `@` and `+` in outer ZIP paths and
limit their depth; scoped npm packages and native Appium sources need their
original names. The Claude builder therefore puts the complete, unchanged
Local server payload in a real `servers/kaijan-local.mcpb` and declares it through
the plugin manifest's `mcpServers` field. Claude's supported MCPB loader extracts
it and starts the same `kaijan_local` server. Core, onboarding and report/mod
helpers retain their outer scripts and bundled native runtime. No dependency
imports, native source filenames, shared installed-runtime guards or Codex
packaging change.

The documented bundled-Node `scripts/private-parameters.mjs` command remains at
the outer plugin path. Its Claude-only wrapper verifies and temporarily extracts
the same bundle, then invokes the unchanged original helper with the caller's
arguments and approved environment. It waits for the command and removes that
temporary payload; it does not infer Claude's cache location or copy secrets to
the extraction directory. The original helper retains session, host and binding
checks.

The outer build records the MCPB and wrapper SHA-256 values. The verifier checks
the inner full payload digest, build identity and every retained outer
runtime/script copy before its Core/Local handshakes. It also provisions and
revokes a synthetic private binding through the actual installed command and
checks wrong-session refusal and temporary cleanup. It retains verification of earlier flat packages. Archive
preflight uses the company upload's size/path/count limits, separately from
successful Claude Code validation. The initial rc.121 size refusal and rc.168
path refusal remain original failed outcomes.

Count the installed outer package, Claude's extracted MCPB cache, the native
runtime generation and temporary staging separately. This layout preserves
bundled Node; it does not reduce total workstation storage. Actual organization
upload, publishing policy, installation and QA connection evidence are on
#5175. See the official [upload requirements](https://platform.claude.com/docs/en/manage-claude/plugins-api#upload-requirements)
and [packaged-server support](https://code.claude.com/docs/en/plugins/components#include-a-packaged-mcpb-server).

## Install and connect

The public plugin uses the standard Kaijan name:

```sh
claude plugin marketplace add katalon-studio/kaijan-marketplace
claude plugin install kaijan@kaijan-claude --scope user
claude
```

Use `/kaijan:setup` with your own Kaijan account. After installing into an open
terminal chat, you can use that command in the same chat. If Claude reports
pending plugin changes, run `/reload-plugins` first. The public instructions use
the normal package and default service. Select QA for the internal verification
below.

### Existing internal company installation

Kaijan **0.5.0-rc.175** is published in **Katalon Development's organization
library** as an opt-in internal QA preview, with Node.js and gh bundled.

1. Sign in to Claude with your own account in **Katalon Development**. Open the
   [company Kaijan entry](https://claude.ai/customize/plugins/id/plugin_01CF6BB6UiyXQgAPpz9qez8S)
   and choose **Add**. The verified Desktop route also finds it under
   **Chat and Cowork → Customize → Skills → Discover**, labeled
   **Organization library**. The Code-mode public catalog is a different view.
2. On a macOS Apple Silicon computer with Claude Code, sign in to the same
   Claude account and start a fresh local session against QA:

   ```sh
   KAIJAN_PROFILE=qa claude
   ```

3. Verify `/plugin` or `claude plugin list --json` shows **kaijan@synced** at
   **0.5.0-rc.175**. If the current session reports changed plugins, run its
   supported `/reload-plugins` action. `/mcp` should show both Kaijan Core and
   Local connected. Open Kaijan Setup if sign-in is needed, and confirm the
   connection uses **https://loki-app.qa.katalon.com** before testing.

Claude Code **2.1.325** passed this actual company Add → account-sync → MCP
readiness flow. The published archive's 61 packaged files match the admitted
automatic Main build, its host-extracted MCPB payload verifies, Core exposes
6 tools and Local 31, and the read-only connection check is connected to QA.
This is installation/connection acceptance, not a new Plan/Run trial or
acceptance of Chat/Cowork execution. Organization sync must be allowed by managed
settings; API-key/provider accounts do not establish this account-sync route.
See [Claude's installation guide](https://support.claude.com/en/articles/13837440-use-plugins-in-claude).

For an existing Marketplace installation, first disable that specific Kaijan
entry in its existing scope, for example
`claude plugin disable kaijan@kaijan-claude --scope local` from its project. Keep its installation,
saved records and grants for rollback; do not enable duplicate Kaijan MCP
registrations. The actual transition retained disabled rc.172, rc.131 and both
rc.121 records before enabling the company-synced plugin.

The company entry is available to members of **Katalon Development**, not a
public GitHub catalog. Its UI restricts the link to people with access, and a
signed-out check redirects to login. Membership must stay limited to the
intended employees; no full membership audit or separate nonmember-account
trial was performed. Organization members can Add it without an Owner action
under the observed automatic member-publishing policy. It is **Available**, not
**Required**, and no organization policy was changed. Earlier public releases
and downloaded copies are not withdrawn by this company publication.

For a later company update, the publisher uploads the separately verified
candidate, publishes the new frozen version through the same organization
controls, and records its actual installation result. Existing edits do not
silently replace a published version. Current provenance and original size/path
refusals are retained in the [publication receipt](https://github.com/katalon-studio/loki/issues/5175#issuecomment-6869759374).

The delivered rc.175 and earlier normal builds contain the same **kaijan** plugin and identity.
Set `KAIJAN_PROFILE=qa` when starting Claude for QA. Unset it for Production
(or select `production`). Restart the plugin processes/session after changing
it; a catalog channel does not select a runtime environment. Core, Local, the
broker, private parameters and onboarding resolve the same startup setting.
The QA and Production account/data namespaces stay separate.

For an existing public preview install, first uninstall its old
`kaijan-qa@kaijan-claude-preview` and/or `kaijan@kaijan-claude-preview` plugin
through normal controls. Remove the old `kaijan-claude-preview` marketplace
registration before adding the same Git repository under its new catalog name.
This removes installation entries, not saved test records or account grants.
Local development marketplaces with other names remain separate.

### Internal QA verification

The public catalog uses Git-subdir with an immutable payload commit. Its
`claude/profiles/production/release.json` records the normal publication's
version/source/checksums; it does not select our test service. Normal public
README and INSTALL output must not instruct customers to use QA. Actual developer
and CI verification still select QA while Production registration is disabled:

```sh
KAIJAN_PROFILE=qa claude
```

For a selected Desktop test workspace, Claude's supported local settings can
supply `"env": { "KAIJAN_PROFILE": "qa" }` in `.claude/settings.local.json`.
Merge that field with existing settings rather than replacing the file. Start a
fresh local Code engine and verify its responding Kaijan connection is QA.
To persist QA across projects, merge the same `env` field into the user's
`~/.claude/settings.json`; project settings may override it. A temporary shell
assignment affects that CLI process, not an already-running Desktop engine.

In Desktop local Code, start the host with the intended environment and verify
the responding Kaijan connection before tests. Changing a shell variable cannot
change an already-running Desktop engine. Remove the old `kaijan-qa` preview
alias through normal plugin controls before enabling the replacement. Keep
saved records and grants; uninstalling is not disconnecting.

Check the release checksums. For a local trial, extract the single-plugin ZIP:

```sh
claude plugin validate /absolute/extracted/kaijan
KAIJAN_PROFILE=qa claude --plugin-dir /absolute/extracted/kaijan
```

The release download includes `.claude-plugin/marketplace.json` and the Core
registration example. Extract the plugin ZIP beside that `.claude-plugin` folder.
For a persistent installation, add this release folder as the marketplace:

```sh
claude plugin marketplace add /absolute/extracted
claude plugin install kaijan@kaijan-claude --scope user
```

For Desktop, open the **Code** tab and choose a **Local** session on the Mac.
Use **+ > Add plugins** (or **Plugins > Manage plugins** in the earlier layout)
to find and enable the same user-scoped plugin. The local CLI and Code tab share
plugin settings. Do not install a second Kaijan plugin or manually configure a
duplicate MCP server. Keep the extracted marketplace source folder available.
Check the session's embedded Claude Code version with `/status`.

When ready, run `/kaijan:setup` in Claude Code or in a local Desktop Code session.
If an open terminal reports pending plugin changes, run `/reload-plugins` first.

Setup uses the same conversation flow as Codex. Kaijan welcomes you in chat,
summarizes the application and goal it already knows, and asks a focused question
if it needs your testing goal. It saves the selected context and summarizes the
result in chat. Connect your Kaijan account when your task requires access.
Planning needs a work item or explicit requirements. Running tests also needs
the target and authorized actions.

In Claude, a request such as “plan tests for this change” can select Kaijan
without naming it. Planning saves proposed checks and leaves execution separate.

Use the normal Claude permission and Stop controls. With mods enabled, the
interruption handler requests Stop only for TestRuns accepted during that main
turn. It does not stop work merely because a Get was cancelled or an older Run
was read. A Stop acknowledgment means the request was received; read the same Run
to confirm completion and cleanup. If the request cannot be confirmed, ask
Kaijan explicitly to stop the active test before starting another. The
[source repair and matching-host qualification](https://github.com/katalon-studio/loki/issues/5391)
remain distinct from the current company rc.175 installation.

Saved work stays in its
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
compact saved-result card. In the original conversation, **Show details** opens
the shared interactive report HTML. Desktop uses **Open Kaijan report** to
follow the browser preference. The report has Tests, Runs, Related work, and
App model when the selected Plan has one. Navigation reads the saved data and
starts no test, assessment or sign-in. Tests are grouped as
Functional and Change impact using the saved plan selection. Review notes come
from saved plan ambiguities and coverage gaps, not generated example text.
Expanded results keep Status, Actual result and Expected result together;
Runs retain the full saved Executed steps separately from unfinished work.

When the tester supplies an authorized target and complete actions, Claude can
run those steps directly and save the assessment and report. Use planning when
the tester asks for a plan or the scenario needs one.

When a combined test starts from a saved plan, follow its Run ID through
`kaijan_run_get` for the assessment and report. The standalone Runner reader
provides the execution record.

Keep Claude mods enabled for visual reports. The native pane serves project
history and is available if the original report cannot open in the browser.
Claude's Local adapter advertises a bounded 500,000-character
result allowance for the three saved-report tools. This keeps ordinary larger
reports available to the native pane in the original requested response. It
does not change other tools, permissions, source records or global host settings.
Reports above the host's allowance can still be unavailable in the pane.
Large truncated tool results use one read of the same saved
report through the plugin's existing Local connection. The plugin never reads
Claude's temporary result files. A resumed tool row can reconstruct its card from
the saved response or one read of its exact report ID; a different returned ID
is refused. Auto mode can refuse that additional read when
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

Anonymous onboarding uses the same default-on, explicit opt-out behavior as
Codex. It sends only runtime/Setup starts and fixed sign-in failures before
connection. `KAIJAN_ANONYMOUS_ONBOARDING_ANALYTICS=0` disables this sink and clears
its local key. Apply the preference at a safe idle boundary because the detached
broker reads it at startup. The signed ticket's legacy `codex-onboarding/1`
discriminator remains a protocol name for both hosts. The normal plugin and
customer service defaults remain unchanged; QA is our verification profile.

## Update and distribution

**Build and verify → select publication → CI publishes and merges the Marketplace
update → install or refresh.** Main changes automatically run **Build / Claude
candidate** and retain the verified artifact for 14 days. A Main merge does not
publish. Candidates use allocated `X.Y.Z-rc.N` versions; a rebuild attempt uses
the same reservation with its attempt suffix. Run IDs remain provenance.
The separate append-only ledger is `claude/candidate-version-ledger`.
Read the candidate's SHA256SUMS digest from its record.

Public tags use **`claude/kaijan/vVERSION`** and the release title is
**`Kaijan — claude/kaijan/vVERSION`**. An official version is `X.Y.Z`, selected
through an existing reviewed Claude source tag. Build that tagged source with
the `tag` input to **Build / Claude candidate**, then select its successful
artifact for publication. Removing an RC suffix changes the manifest; the
official package must be built and verified separately. Published bytes and
existing tags are never relabeled. The [Claude version policy](https://github.com/katalon-studio/loki/blob/main/docs/development/claude-version-policy.md)
records baseline, change classification and migration rules.

The build compiles one normal runtime payload, derives the fixed-QA package
from those same complete bytes, and tests both through pinned local Git-subdir
installation in disposable homes. Both actual service startups use QA. CI retains
one paired candidate (`kaijan.claude-candidate/3`), its combined SHA256SUMS and
separate native receipts. It does not run a second library build or publish.

Run **Release / Claude marketplace** on Main with the successful build run,
exact attempt, combined SHA256SUMS digest and selected **profile** (normal
production package by default). The receiver checks both package identities,
their common payload, the nine common skills and actual QA Git-install receipts.
Legacy receipts remain historical. Select a new paired candidate for
this publisher. Source/version reservation still belongs to the normal package;
its existing ledger and stable source-tag policy are unchanged.

Publication updates only the selected plugin under `claude/plugins/kaijan` or
`claude/plugins/kaijan-qa`. Its catalog source is `git-subdir` with that path and
the exact 40-character payload commit. A following commit updates the catalog,
selected profile receipt and Claude install guidance. The other Claude entry,
Codex, unrelated metadata and README content are preserved. ZIP downloads remain
available, but the catalog no longer installs the selected entry from an archive.
An unselected legacy entry retains its recorded source until explicitly updated.

The normal public tag remains `claude/kaijan/vVERSION`; QA uses
`claude/kaijan-qa/vVERSION`. Both share the allocated version, with independent
profile receipts and immutable assets. Public SHA256SUMS covers all flat release
assets; `profile-SHA256SUMS` retains the original local-release checksums.
`release-metadata.zip` restores the complete local metadata tree beside the plugin
ZIP for the generated INSTALL instructions. The paired candidate digest remains
recorded separately. All uploaded assets are read back before the catalog PR can
merge, subject to normal checks and repository protections. With
`publish_marketplace=false`, only the private release is created. Main merges do
not trigger public publication.

Use `claude plugin marketplace update kaijan-claude`, then
`claude plugin update kaijan-qa@kaijan-claude` (or the selected normal `kaijan` entry) and start/resume the original
session. Verify the responding plugin version. Uninstall with the supported
`claude plugin uninstall` control; use Kaijan disconnect to revoke its account
grant. Keep an installed local marketplace's source directory available.

### GitHub distribution and Anthropic directory

The GitHub marketplace is independently installable; it is not an official
Anthropic listing. Follow the [official publication guide](https://code.claude.com/docs/en/plugins/publish)
for a directory submission through [the developer portal](https://claude.ai/directory/manage).
It requires an eligible paid account; organization submission permissions and
portal validation are separate from CI. The `claude-plugins-official` marketplace
uses Anthropic's partner route rather than that portal. Do not claim submission
or approval from a successful GitHub release.

Before any directory submission, retain strict validation, the exact selected
public revision, install/connection instructions, supported macOS/Code Local
surfaces and their actual QA evidence. Review portal component support: Kaijan's
local runtime and native mods do not establish Chat/Cowork compatibility. Production
client registration is disabled, so this work does not claim a Production-ready
public service. No official listing is submitted by this workflow.

The [host mode guide](references/host-modes.md) records CLI/Desktop differences,
install and update controls, native verification steps and the limits of Chat,
Cowork and remote execution. Desktop Code is the first Desktop target; its real
workflow acceptance is separate from portable package checks. Intel Mac, Linux,
Windows and remote execution need separate acceptance.

See the official [plugin reference](https://code.claude.com/docs/en/plugins-reference)
and [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference).
