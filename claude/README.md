# Kaijan for Claude

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
