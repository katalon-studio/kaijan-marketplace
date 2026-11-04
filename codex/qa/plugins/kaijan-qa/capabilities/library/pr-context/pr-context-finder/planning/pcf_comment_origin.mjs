import { eligibility, codec } from "./shared.mjs";
import { encodedJson } from "../related/json.mjs";
import { object } from "./semantics.mjs";
export function filterComments(records, enabled = true) {
  if (
    typeof enabled !== "boolean" ||
    !Array.isArray(records) ||
    records.some((r) => !object(r))
  )
    throw Error("invalid_comment_origin_input");
  const decisions = records.map((r) =>
    eligibility.authoredEligibility(codec.parseJson(encodedJson(r)), null, {
      role: "comment",
      commentOriginFilter: enabled,
    }),
  );
  return [
    records.filter((_, i) => decisions[i].decision === "retain"),
    decisions,
  ];
}
