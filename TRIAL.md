# Profile catalog trial

This branch tests profile-specific Admin imports. It does not change the active
main branch or GitHub Releases. Packages keep their published bytes and versions.

In Admin → Plugins → Add → Import marketplace:

- Source: https://github.com/katalon-studio/kaijan-marketplace
- Ref: codex/profile-isolation-trial
- Path: codex/qa for QA, or codex/production for Production

Each selected path must import only its own profile. Review availability and
installation policy for the test workspace. Do not treat this branch as an
ongoing update channel or replace an existing team source during this test.

Source implementation: https://github.com/katalon-studio/loki/pull/2837 (draft).
Admin import has not yet been verified. Do not merge this trial branch.
