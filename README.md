# Kaijan marketplace

Public distribution packages for Kaijan plugins and integrations. Source history,
credentials and private verification reports stay outside this repository.

## Install

| Platform | Status | Location |
| --- | --- | --- |
| Codex | Available packages are listed in its marketplace | [codex](codex/) |
| Claude | Reserved; no installable package yet | [claude](claude/) |
| Kiro | Reserved; no installable package yet | [kiro](kiro/) |

Codex desktop: add https://github.com/katalon-studio/kaijan-marketplace.git with Git ref
`main`, then install only the required profile. The root catalog lists both profiles;
a catalog entry is not an installation. The root Codex manifest points into
`codex/`; it does not contain another copy of the plugins.

Workspace admin: Import marketplace from https://github.com/katalon-studio/kaijan-marketplace,
Path `codex/qa` for QA or `codex/production` for Production, ref `main`.
Each path lists only its own environment. Set workspace access policies after import.
Each member connects their own Kaijan account. Public installation does not grant
service access. QA is a preview environment.

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
