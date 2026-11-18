# Kaijan marketplace

Public distribution packages for Kaijan plugins and integrations. Source history,
credentials and private verification reports stay outside this repository.

## Install

| Platform | Status | Location |
| --- | --- | --- |
| Codex | Available packages are listed in its marketplace | [codex](codex/) |
| Claude | Available | [claude](claude/) |
| Kiro | Reserved; no installable package yet | [kiro](kiro/) |

Codex desktop: open Plugins → Add → Add a marketplace. Set Source to
https://github.com/katalon-studio/kaijan-marketplace. Set Git ref to `main` and leave
Sparse paths empty. Add the marketplace, then install Kaijan under
Kaijan for Codex — Production. The root catalog lists only Production and points
to the same package as `codex/production`; it does not copy the runtime.
There is no marketplace catalog at `codex/`.

For terminal use, follow the [Codex CLI quickstart](codex/README.md#codex-cli).

Workspace admin: Import marketplace from https://github.com/katalon-studio/kaijan-marketplace,
Path `codex/qa` for QA or `codex/production` for Production, ref `main`.
Each path lists only its own environment. Set workspace access policies after import.
Each member connects their own Kaijan account. Public installation does not grant
service access. QA is a preview environment.

<!-- kaijan-claude-install:start -->
## Kaijan for Claude

Kaijan is a testing plugin. Plan application tests, run authorized checks and review saved reports in Claude.

Requires macOS Apple Silicon and Claude Code 2.1.318 or later. In Claude Desktop, use the Code tab and a Local session; check the embedded version with /status.

Add the marketplace and install Kaijan:

```sh
claude plugin marketplace add katalon-studio/kaijan-marketplace
claude plugin install kaijan@kaijan-claude --scope user
claude
```

Use /kaijan:setup to connect your Kaijan account and select the application. A Kaijan account with service access is required; installing the plugin does not grant that access. Describe the checks you authorize, then use /kaijan:review-report to review the saved result.

Use /kaijan:demo to try two tests on the public TodoMVC example and review their saved results.

In local Desktop Code, enable the installed plugin through Add plugins or Manage plugins. Do not add a second Kaijan MCP configuration. Internal users may instead use the company-managed entry; its version and update policy are independent of this marketplace.

The catalog installs a Git subdirectory pinned to the release's immutable payload commit. Downloadable ZIPs remain available for manual installation. Use the supported plugin update and uninstall controls; saved work and account grants are separate from the installation.

Publication in this Katalon marketplace is separate from Anthropic's plugin-directory listing.

Anonymous onboarding is on by default. It sends runtime and Setup starts and fixed sign-in failure codes before you connect. Set `KAIJAN_ANONYMOUS_ONBOARDING_ANALYTICS=0` to opt out. The broker reads this setting at startup; finish active work before restarting it.

<!-- kaijan-claude-install:end -->

## Releases and updates

`main` is the only active distribution branch. A publication replaces only one
platform/plugin/profile. Other packages keep their exact bytes. See
[catalog.json](catalog.json) for current versions and source identities; this
index is not an installer manifest.

Version releases use tags such as `codex/kaijan/v0.5.0`. Untagged builds replace
only their own asset in `latest`. Asset names include platform, plugin and profile.
Immutable `snapshots/<platform>/<plugin>/<profile>/<version>` tags retain build
receipts without creating branches. Release upload completes before main moves.

Install from main to follow updates. Fixed tags and commits pin a version.
Workspace synchronization and desktop refresh follow the host's own behavior.
Manual Codex refresh is distinct from unattended team synchronization.

## Add a platform or plugin

Each platform owns its format, manifest and installer checks. Add its adapter and
verify installation before advertising it here. Never place a Codex package in a
Claude or Kiro catalog and assume compatibility. QA and Production have separate
installation identities. Publishing either profile updates only its own package.
