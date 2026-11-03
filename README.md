# Kaijan — qa

Version: 0.4.0-preview.2. Platform: macOS ARM64.

## Install

In Codex desktop, add this GitHub marketplace and install Kaijan — QA.

For a team, use Admin → Plugins → Add → Import marketplace:

- Source: https://github.com/thongnguyen23/kaijan-marketplace
- Path: leave empty
- Branch, tag, or commit: channel/qa

Set the workspace installation policy after import. Each member connects their own Kaijan account. Installing this package does not grant service access or GitHub repository access.

## Updates

Keep the source on channel/qa. Workspace marketplaces check daily; admins can use Sync now. Local desktop refresh and running-session activation must be verified for the client version. Do not remove and reinstall to update. GitHub Release ZIPs are downloads, not the update mechanism.

The broker upgrades when idle and keeps the existing Keychain grant and data. An active operation is not replayed. A broker from before version negotiation needs one explicit connection restart.

## Trial

Run Kaijan Connect with your own account. Service eligibility and limits are controlled by the Kaijan service; this repository does not grant a trial entitlement. QA is a preview environment. Do not use company credentials shared by another user.

## Package

This branch contains the distributed plugin and third-party notices. Source history and internal build reports are not included. Node is prepared with an ad-hoc signature; this preview is not a notarized Production installer.
