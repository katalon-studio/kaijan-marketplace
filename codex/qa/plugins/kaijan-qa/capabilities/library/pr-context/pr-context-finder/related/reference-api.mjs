import { referenceIdentities } from "../reference-parser.mjs";
export function references(text, repo, includeRoutes = false) {
  return referenceIdentities(text, repo, includeRoutes);
}
