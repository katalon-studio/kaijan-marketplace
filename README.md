# Kaijan Marketplace

Public distribution for Kaijan plugins and integrations. Product source development remains private.

## Codex preview

The QA package targets Codex desktop on macOS ARM64. Add this repository as a GitHub marketplace and select `channel/qa`. For workspace installation, use Admin → Plugins → Add → Import marketplace, leave Path empty, and select the same branch.

The current QA preview is `0.4.0-preview.2`. A Codex desktop UI upgrade from `.1` to `.2` was verified without uninstalling the plugin or restarting the app. Login and retained results survived. The package was also downloaded with Git credentials disabled and checked against its build inventory. Installation does not grant access to the Kaijan service. Each participant connects their own account and may need pilot approval.

## Releases and updates

Version releases retain selected-profile packages. Untagged builds update `latest`. Moving channel branches provide marketplace updates; downloading a ZIP alone does not enable automatic updates.

Workspace sync and local desktop refresh have different behavior. Admin/team automatic upgrade acceptance is still pending. The initial preview uses an ad-hoc signed Node runtime and is not a notarized Production installer.

## Other integrations

This repository can host additional Kaijan integrations. Each integration will document its platform, installation steps and update channel.

Distributed third-party components include their own notices and licenses.
