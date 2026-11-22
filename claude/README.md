# Kaijan for Claude

Kaijan is a testing plugin. Plan application tests, run authorized checks and review saved reports in Claude.

Requires macOS Apple Silicon and Claude Code 2.1.318 or later. In Claude Desktop, use the Code tab and a Local session; check the embedded version with /status.

Add the marketplace and install Kaijan:

```sh
claude plugin marketplace add katalon-studio/kaijan-marketplace
claude plugin install kaijan@kaijan-claude --scope user
claude
```

After installing, run `/kaijan:setup` and describe what you want to test. If you installed Kaijan in an open terminal chat, run Setup in that same chat. If Claude reports pending plugin changes, run `/reload-plugins` first.

Kaijan asks for missing context in chat and summarizes the saved application and goal. Kaijan reuses your signed-in account when you have one. If a selected action needs access and your connection is unavailable, complete Kaijan sign-in in your browser. Describe the checks you authorize, then use `/kaijan:review-report` to review the saved result.

In Claude Desktop, open Code in a Local session, enable Kaijan through Add plugins or Manage plugins, then run `/kaijan:setup`. Do not add a second Kaijan MCP configuration. Internal users may instead use the company-managed entry; its version and update policy are independent of this marketplace.

The catalog installs a Git subdirectory pinned to the release's immutable payload commit. Downloadable ZIPs remain available for manual installation. Use the supported plugin update and uninstall controls; saved work and account grants are separate from the installation.

Publication in this Katalon marketplace is separate from Anthropic's plugin-directory listing.

Anonymous onboarding is on by default. It sends runtime and Setup starts and fixed sign-in failure codes before you connect. Set `KAIJAN_ANONYMOUS_ONBOARDING_ANALYTICS=0` to opt out. The broker reads this setting at startup; finish active work before restarting it.
