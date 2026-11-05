import { createHash } from "node:crypto";
import {
  applicationCatalog,
  planningTextSchema,
  renderPlanningText,
} from "./source-relations.mjs";
const clone = (value) => JSON.parse(JSON.stringify(value));
export const SUPPLEMENT_SOURCE_VERSION = "supplement-source-relations/1";
export const supplementSourceHash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function generatedSupplementSource(text) {
  if (typeof text !== "string") return false;
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return false;
  }
  if (!object(value)) return false;
  return (
    (object(value.plan) &&
      (object(value.checks) ||
        object(value.receipt) ||
        Array.isArray(value.evidence))) ||
    (typeof value.schema === "string" &&
      /^(?:loki\.|kaijan\.|change-risk-finder\/|risk-finder\/|work-verifier\/|test-plan-supplement-result\/|pr-context-related\/)/.test(
        value.schema,
      )) ||
    (typeof value.kind === "string" &&
      [
        "test-plan",
        "test-supplement",
        "evidence-assessment",
        "change-risk",
        "work-item-risk",
        "risk-review",
        "related-work",
      ].includes(value.kind))
  );
}
/** Only the host-reconstructed original context can supply this catalogue.
 * Risk links remain useful, but risk-generated prose is not an action oracle. */
export function supplementApplicationCatalog(prepared) {
  const excluded = new Set(
    (prepared.original_context?.sources ?? [])
      .filter((source) => generatedSupplementSource(source.text))
      .map((source) => source.id),
  );
  return applicationCatalog(prepared.evidence_catalog).filter(
    (row) =>
      !row.source_id.startsWith("supplement-risk-") &&
      !excluded.has(row.source_id) &&
      !row.source_id.startsWith("kaijan-planning-source-requests") &&
      !String(row.uri).startsWith("kaijan-planning://"),
  );
}
export const supplementVerificationKinds = [
  "requirement-validation",
  "conditional-investigation",
  "completion-evidence",
  "unresolved",
];
const verification = {
  "requirement-validation": "Proposed requirement validation",
  "conditional-investigation": "Proposed conditional investigation",
  "completion-evidence": "Proposed completion evidence",
  unresolved: "Verification purpose needs confirmation",
};
export function mapSupplementText(value, transform) {
  const many = (values, role, refs) =>
    values.map((item) => transform(item, role, refs));
  return {
    ...value,
    additional_tests: value.additional_tests.map((test) => ({
      ...test,
      verification_kind: transform(
        test.verification_kind,
        "verification-kind",
        test.source_refs,
      ),
      method: transform(test.method, "method", test.source_refs),
      reason: transform(test.reason, "reason", test.source_refs),
      conditions: many(test.conditions, "condition", test.source_refs),
      prerequisites: many(test.prerequisites, "prerequisite", test.source_refs),
      steps: many(test.steps, "step", test.source_refs),
      expected: {
        ...test.expected,
        text: transform(
          test.expected.text,
          test.expected.authority === "requirement"
            ? "requirement-expectation"
            : "expectation",
          test.expected.refs,
        ),
      },
      baseline_relation: {
        ...test.baseline_relation,
        explanation: transform(
          test.baseline_relation.explanation,
          "baseline-relation",
          test.source_refs,
        ),
      },
      execution_gaps: many(test.execution_gaps, "gap", test.source_refs),
    })),
    baseline_concerns: value.baseline_concerns.map((row) => ({
      ...row,
      concern: transform(row.concern, "concern", row.refs),
      question: transform(row.question, "question", row.refs),
    })),
    unanswered_questions: value.unanswered_questions.map((row) => ({
      ...row,
      question: transform(row.question, "question", row.refs),
    })),
    limitations: many(value.limitations, "limitation", []),
  };
}
export function supplementGenerationSchema(schema, prepared) {
  const output = clone(schema),
    text = planningTextSchema(supplementApplicationCatalog(prepared)),
    p = output.properties;
  const set = (row, key) => {
    row.properties[key] = clone(text);
  };
  const test = p.additional_tests.items;
  test.properties.id = { type: "string", pattern: "^A[1-9][0-9]{0,5}$" };
  test.properties.verification_kind = {
    type: "string",
    enum: supplementVerificationKinds,
  };
  for (const key of ["method", "reason"]) set(test, key);
  for (const key of ["conditions", "prerequisites", "steps", "execution_gaps"])
    test.properties[key].items = clone(text);
  set(test.properties.expected, "text");
  set(test.properties.baseline_relation, "explanation");
  for (const key of ["concern", "question"])
    set(p.baseline_concerns.items, key);
  set(p.unanswered_questions.items, "question");
  p.limitations.items = clone(text);
  return output;
}
export function renderSupplementCandidate(candidate, prepared) {
  const catalog = supplementApplicationCatalog(prepared),
    byId = new Map(catalog.map((row) => [row.id, row]));
  if (
    !candidate.additional_tests.every((row) =>
      /^A[1-9][0-9]{0,5}$/.test(row.id),
    )
  )
    throw Error("Unsupported addition identity");
  return mapSupplementText(candidate, (value, role, refs) => {
    if (role === "verification-kind") {
      if (!Object.hasOwn(verification, value))
        throw Error("Unsupported verification purpose");
      return verification[value];
    }
    if (role === "method" && value?.kind !== "method")
      throw Error("Supplement method needs a supported approach");
    const operands =
      value?.kind === "source"
        ? [value.span]
        : value?.kind === "relation"
          ? value.operands
          : [];
    const allowed = new Set(refs.map((ref) => ref.evidence_id));
    if (operands.some((span) => !allowed.has(span.evidence_id)))
      throw Error("Supplement relation exceeds its source references");
    if (
      role === "requirement-expectation" &&
      (operands.length === 0 ||
        operands.some((span) => byId.get(span.evidence_id)?.kind !== "intent"))
    )
      throw Error("Supplement requirement needs original intent spans");
    return renderPlanningText(value, catalog);
  });
}
export function supplementSourceRecord(candidate, prepared) {
  return {
    schema: SUPPLEMENT_SOURCE_VERSION,
    candidate: clone(candidate),
    catalogSha256: supplementSourceHash(supplementApplicationCatalog(prepared)),
  };
}
export const supplementSourceInstructions = `
Customer presentation uses typed application source spans and fixed proposed relations. Use the provided source schema for every text field. Exact source spans use evidence_id and UTF-16 start/end offsets into its quote. Do not invent a label, method, reason, option, or explanation. Use only original application/task context, never generated risk packets, baseline wrappers, internal runtime details or accounting. Risk and baseline links stay proposed associations, not semantic proof. Addition IDs must be A1, A2, and so on, distinct from all baseline IDs. verification_kind uses a supported enum; method uses a method node. Each field's operand sources must belong to that field's declared source references. Requirement expectations must use original intent operands listed in expected.refs. Missing context uses an explicit gap, not an invented expected result. Typed relations describe proposed checks only, never observed actions, authorization or verified findings. Keep every distinct useful condition, action, expectation, baseline concern and unresolved question. Do not execute, acquire context, or repair by replaying operations.
`;
