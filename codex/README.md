# Kaijan for Codex

Use Admin import with ref main and Path codex/qa or codex/production.
Each marketplace lists only its selected environment. There is no catalog at the
repository root or at codex/. Existing imports of those old paths need an explicit
migration to a profile Path; they do not switch automatically. Verify the new
import and installed runtime before retiring the old source. Each plugin retains
its own version, service connection and runtime.

Package releases include checksums and a standalone install guide. See the root
README for version releases, preview limits and future platform adapters.
