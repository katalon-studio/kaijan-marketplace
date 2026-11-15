# Kaijan marketplace

Public distribution packages for Kaijan plugins and integrations. Source history,
credentials and private verification reports stay outside this repository.

## Install

| Platform | Status | Location |
| --- | --- | --- |
| Codex | Available packages are listed in its marketplace | [codex](codex/) |
| Claude | QA package; Production client registration disabled | [claude](claude/) |
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

Requires macOS Apple Silicon and Claude Code 2.1.318 or later. In Claude Desktop, use the Code tab and a Local session; check the embedded version with /status. Chat and remote sessions are separate surfaces.

Add this GitHub marketplace, then install the normal package and start it with QA selected:

```sh
claude plugin marketplace add katalon-studio/kaijan-marketplace
claude plugin install kaijan@kaijan-claude --scope user
KAIJAN_PROFILE=qa claude
```

Start a new session and use /kaijan:setup with your own eligible Kaijan QA account. Production Claude client registration is disabled; installing a plugin does not enable service access. The fixed QA demo variant has not been added to this catalog yet. The normal kaijan package has the same common skills and omits both demos; use KAIJAN_PROFILE=qa when starting it for QA.

In local Desktop Code, enable the installed plugin through Add plugins or Manage plugins. Do not add a second Kaijan MCP configuration. Internal users may instead use the company-managed entry; its version and update policy are independent of this GitHub marketplace.

The selected catalog entry uses a Git subdirectory pinned to an immutable payload commit. Downloadable ZIPs remain available for manual verification and company-upload preparation; the catalog does not install from those archives. Older entries retain their previous source until that profile is explicitly updated. Use supported update/uninstall controls, preserve your saved work, and reconnect only through normal account controls.

This repository is a third-party marketplace. Publication here does not establish acceptance into Anthropic's official plugin directory.

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
