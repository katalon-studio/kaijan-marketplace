import { createHash } from "node:crypto";

export const QUESTION_FIELDS = Object.freeze([
  "observed_code_behavior",
  "assumption_to_confirm",
  "question",
  "why_it_matters",
  "source_evidence",
  "evidence_needed",
]);
const hash = (text) => createHash("sha256").update(text).digest("hex");

// Content presence is not evidence of truth, source support or semantic identity.
export function questionContent(value) {
  return Object.fromEntries(
    QUESTION_FIELDS.map((key) => [
      key,
      key === "source_evidence"
        ? (Array.isArray(value?.source_evidence)
            ? value.source_evidence
            : []
          ).filter((item) => typeof item === "string")
        : typeof value?.[key] === "string"
          ? value[key]
          : "",
    ]),
  );
}
export function questionContentSchema(schema) {
  const item = structuredClone(schema);
  delete item.properties.id;
  item.required = item.required.filter((key) => key !== "id");
  return item;
}
export function questionIdentity(
  serializedOutput,
  stage,
  serialization = "original_output_text",
) {
  return {
    origin: "host_derived_display_address",
    stage,
    output_sha256: hash(serializedOutput),
    serialization,
    generated_display_ids: "not_used",
    semantic_consistency_or_cross_stage_identity: "not_verified",
  };
}
export function bindQuestion(value, index, identity) {
  return {
    id: `${identity.stage}-Q${index + 1}-${identity.output_sha256}`,
    ...questionContent(value),
  };
}
export function bindQuestions(value, serializedOutput, stage = "review") {
  const identity = questionIdentity(serializedOutput, stage);
  return {
    assumptions_to_confirm: (Array.isArray(value?.assumptions_to_confirm)
      ? value.assumptions_to_confirm
      : []
    ).map((q, index) => bindQuestion(q, index, identity)),
    limitations:
      typeof value?.limitations === "string" ? value.limitations : "",
    question_identity: identity,
  };
}
export function reviewContent(review) {
  return {
    assumptions_to_confirm: (Array.isArray(review?.assumptions_to_confirm)
      ? review.assumptions_to_confirm
      : []
    ).map(questionContent),
    limitations: review.limitations,
  };
}
export function responseText(response) {
  return response.output
    .filter((v) => v.type === "message")
    .flatMap((v) => v.content ?? [])
    .filter((v) => v.type === "output_text")
    .map((v) => v.text)
    .join("");
}
