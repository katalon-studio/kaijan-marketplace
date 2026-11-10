# Kaijan for Codex

For Production, add the repository Git URL in Codex desktop with ref main and
leave Sparse paths empty. The root catalog lists only Production. Admin can use
Path codex/qa or codex/production on the same ref. There is no catalog at codex/.
The root and Production profile catalog share the kaijan-codex-production
identity; choose one source for that environment. Old kaijan-codex aggregate
imports need explicit migration. Verify the new source and installed runtime
before retiring the old source. Each plugin retains its own version, service
connection and runtime.

## Codex CLI

Use the Production package on Apple silicon macOS. In an up-to-date Codex CLI,
add the Marketplace and install Kaijan once.

```sh
codex plugin marketplace add https://github.com/katalon-studio/kaijan-marketplace.git --ref main
codex plugin add kaijan@kaijan-codex-production
```

Open a new interactive session with `codex` from the repository you want to test.
Sign in to Codex if prompted. Ask Kaijan to connect and follow the browser
instructions if it needs your Kaijan account. Installation alone gives no
workspace or application access.

1. **Setup and plan.** Ask Kaijan to use the current repository commit, your
   work item or expected behavior, and an approved test URL. Ask it to save a
   plan and wait for your approval.
2. **Run and assess.** Review the plan. Ask Kaijan to run that saved plan and
   state what actions you authorize. Keep the CLI open until it returns the
   assessment or reports that the Run is incomplete.
3. **Reopen the report.** In the same session, ask Kaijan to reopen the saved
   report for that Run and show its results and available evidence. If you
   closed the CLI, resume the same session first.

Package releases include checksums and a standalone install guide. See the root
README for version releases, preview limits and future platform adapters.
