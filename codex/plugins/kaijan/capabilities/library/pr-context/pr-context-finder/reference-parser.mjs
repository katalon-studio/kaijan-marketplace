import { existsSync } from "node:fs";
// Two explicit distribution layouts, one implementation. Missing files refuse;
// neither layout can fall back to the retired regular-expression parser.
const bundled = new URL(
  "./github-references/github_references.mjs",
  import.meta.url,
);
export const {
  scanReferences,
  referenceIdentities,
  identitiesForScan,
  REFERENCE_CONTRACT,
} = existsSync(bundled)
  ? await import("./github-references/github_references.mjs")
  : await import("../github-capture/github_references.mjs");
