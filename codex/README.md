# Kaijan for Codex

For Production, add the repository Git URL in Codex desktop with ref main and
leave Sparse paths empty. The root catalog lists only Production. Admin can use
Path codex/qa or codex/production on the same ref. There is no catalog at codex/.
The root and Production profile catalog share the kaijan-codex-production
identity; choose one source for that environment. Old kaijan-codex aggregate
imports need explicit migration. Verify the new source and installed runtime
before retiring the old source. Each plugin retains its own version, service
connection and runtime.

Package releases include checksums and a standalone install guide. See the root
README for version releases, preview limits and future platform adapters.
