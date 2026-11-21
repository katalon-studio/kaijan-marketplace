# Kaijan for Claude

Kaijan is a testing plugin. Plan application tests, run authorized checks and review saved reports in Claude.

Requires macOS Apple Silicon and Claude Code 2.1.318 or later. In Claude Desktop, use the Code tab and a Local session; check the embedded version with /status.

Add the marketplace and install Kaijan:

```sh
claude plugin marketplace add katalon-studio/kaijan-marketplace
claude plugin install kaijan@kaijan-claude --scope user
claude
```

Use /kaijan:setup and describe what you want to test. Kaijan asks for missing context in chat and summarizes the saved application and goal. Connect your Kaijan account when your task needs service access. Describe the checks you authorize, then use /kaijan:review-report to review the saved result.

In local Desktop Code, enable the installed plugin through Add plugins or Manage plugins. Do not add a second Kaijan MCP configuration. Internal users may instead use the company-managed entry; its version and update policy are independent of this marketplace.

The catalog installs a Git subdirectory pinned to the release's immutable payload commit. Downloadable ZIPs remain available for manual installation. Use the supported plugin update and uninstall controls; saved work and account grants are separate from the installation.

Publication in this Katalon marketplace is separate from Anthropic's plugin-directory listing.

Anonymous onboarding is on by default. It sends runtime and Setup starts and fixed sign-in failure codes before you connect. Set `KAIJAN_ANONYMOUS_ONBOARDING_ANALYTICS=0` to opt out. The broker reads this setting at startup; finish active work before restarting it.
