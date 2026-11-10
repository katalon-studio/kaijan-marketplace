# Kaijan previews for Claude Code

QA and Production preview bundles for macOS Apple Silicon, using the same plugin package in Claude Code CLI and local Claude Desktop Code. Chat, Cowork and the official Claude marketplace are outside this preview.

## Install QA for testing

In Claude Code:

```text
/plugin marketplace add katalon-studio/kaijan-marketplace#codex/4416-claude-preview
/plugin install kaijan-qa@kaijan-claude-preview
```

Choose a local or project installation for testing. Follow Claude's reload instructions, then use the plugin's Setup skill to connect to QA. Select the intended environment when testing.

The preview is currently published on this branch. After its PR reaches Main, the repository URL without the branch suffix can be used.

For the Production bundle, install `kaijan@kaijan-claude-preview` from the same marketplace. Publishing these files does not deploy a service or establish Production model/account readiness.

Claude Code 2.1.318 or newer is required. Desktop Code uses the version bundled with the app. A native report render is separate from a CLI text read. The existing Codex plugin and its publication are unchanged.

## Exact packages and audit notes

Each profile's `provenance.json` records the original successful CI build, clean source, version and ZIP digest. The plugin files are copied from those audited original archives with their executable flags; no account credentials, local test stores or caller reports are included.

The two package audits found no critical issue in the recorded manifest and archive checks. They retain moderate advisories in glob 13.0.6 ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)) and minimatch 10.2.6 ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). Node 24.x has an [announced HIGH-severity security update for 11 November 2026](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases). The current bundles retain Node 24.22.1. These checks are not exhaustive vulnerability coverage of compiled/native dependencies.

The [real GitHub-installed QA CLI check](qa/verification/2026-11-10-github-cli/receipt.json) passed on the original supplied scenario. The retained [Completed](qa/verification/2026-11-10-github-cli/completed.png) and [Active](qa/verification/2026-11-10-github-cli/active.png) screenshots show its result. This is one simple case, not full plugin acceptance. Main review also retains the public PR scanner findings; they are not declared cleared. Known host limits include one-shot CLI lifetime, sign-in continuity and clear/resume session binding; saved results and first failures must remain intact.

The [finding-by-finding security receipt](security-review/2026-11-10-aikido.json) independently verifies all 71 reported secret values visible in the inspected inline comments as content hashes. It also records the source trace for nine file-operation findings and the remaining 11 reported findings without inline detail. The [nine packaged storage controls](security-review/2026-11-10-storage-controls.json) pass. These are review evidence, not an accepted scanner exception or a claim that the security gate passes.
