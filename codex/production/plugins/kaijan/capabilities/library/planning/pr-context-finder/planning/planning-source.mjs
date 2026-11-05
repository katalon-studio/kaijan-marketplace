import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  applicationCatalog,
  planningTextSchema,
  planningExcerptSchema,
  renderPlanningExcerpt,
  renderPlanningText,
} from "./source-relations.mjs";
export const SOURCE_PLAN_VERSION = "planning-source-relations/1";
export const EXCERPT_PLAN_VERSION = "planning-source-relations/2";
export function renderSourcePlanText(value, catalog, version) {
  need([SOURCE_PLAN_VERSION, EXCERPT_PLAN_VERSION].includes(version));
  return (
    version === EXCERPT_PLAN_VERSION
      ? renderPlanningExcerpt
      : renderPlanningText
  )(value, catalog);
}
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const need = (condition) => {
  if (!condition) throw Error("Invalid planning source relation");
};
const exact = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
// Only these prose leaves change. IDs, links, selection, priority and authority
// remain separate data. No recursive arbitrary-key rewriting is performed.
export function mapPlanningText(plan, transform) {
  const list = (rows, role) => rows.map((value) => transform(value, role));
  return {
    ...plan,
    ...(plan.test_outline
      ? {
          test_outline: plan.test_outline.map((row) => ({
            ...row,
            purpose: transform(row.purpose, "purpose"),
          })),
        }
      : {}),
    objectives: plan.objectives.map((row) => ({
      ...row,
      text: transform(row.text, "objective"),
    })),
    ambiguities: list(plan.ambiguities, "ambiguity"),
    relevant_surfaces: plan.relevant_surfaces.map((row) => ({
      ...row,
      description: transform(row.description, "surface"),
    })),
    tests: plan.tests.map((row) => ({
      ...row,
      ...(row.title === undefined
        ? {}
        : { title: transform(row.title, "title") }),
      method: transform(row.method, "method"),
      reason: transform(row.reason, "reason"),
      prerequisites: list(row.prerequisites, "prerequisite"),
      steps: list(row.steps, "step"),
      expected: {
        ...row.expected,
        text: transform(row.expected.text, "expectation"),
      },
      execution_gaps: list(row.execution_gaps, "gap"),
    })),
    requirement_coverage: plan.requirement_coverage.map((row) => ({
      ...row,
      reason: transform(row.reason, "coverage"),
    })),
    disagreements: list(plan.disagreements, "disagreement"),
    runner_handoff: {
      ...plan.runner_handoff,
      required_inputs: list(
        plan.runner_handoff.required_inputs,
        "required-input",
      ),
    },
    limitations: list(plan.limitations, "limitation"),
  };
}
export function sourceGenerationSchema(
  schema,
  catalog,
  version = SOURCE_PLAN_VERSION,
) {
  need([SOURCE_PLAN_VERSION, EXCERPT_PLAN_VERSION].includes(version));
  const output = clone(schema),
    text = (
      version === EXCERPT_PLAN_VERSION
        ? planningExcerptSchema
        : planningTextSchema
    )(catalog),
    p = output.properties;
  const set = (row, key) => {
    row.properties[key] = clone(text);
  };
  set(p.objectives.items, "text");
  set(p.relevant_surfaces.items, "description");
  if (p.test_outline) set(p.test_outline.items, "purpose");
  for (const key of ["ambiguities", "disagreements", "limitations"])
    p[key].items = clone(text);
  const test = p.tests.items;
  const testId = { type: "string", pattern: "^T[1-9][0-9]{0,5}$" };
  const objectiveId = { type: "string", pattern: "^O[1-9][0-9]{0,5}$" };
  test.properties.id = clone(testId);
  test.properties.objective_ids.items = clone(objectiveId);
  p.objectives.items.properties.id = clone(objectiveId);
  if (p.test_outline) p.test_outline.items.properties.id = clone(testId);
  for (const key of ["title", "method", "reason"]) set(test, key);
  for (const key of ["prerequisites", "steps", "execution_gaps"])
    test.properties[key].items = clone(text);
  const expected = test.properties.expected;
  for (const variant of expected.anyOf ?? [expected]) set(variant, "text");
  set(p.requirement_coverage.items, "reason");
  p.runner_handoff.properties.required_inputs.items = clone(text);
  return output;
}
export function validatePlanningRelationAuthority(candidate, suppliedCatalog) {
  const catalog = applicationCatalog(suppliedCatalog);
  const spans = (node) =>
    ["source", "prerequisite"].includes(node?.kind)
      ? [node.span]
      : node?.kind === "relation"
        ? node.operands
        : [];
  const check = (node, refs, intent) => {
    const selected = spans(node);
    need(Array.isArray(selected));
    for (const span of selected) {
      const row = catalog.find((source) => source.id === span.evidence_id);
      need(
        row &&
          refs.some((ref) => ref.evidence_id === row.id) &&
          (!intent || row.kind === "intent"),
      );
    }
  };
  for (const row of candidate.objectives) check(row.text, row.refs, true);
  for (const row of candidate.relevant_surfaces)
    check(row.description, row.refs, false);
  for (const row of candidate.tests)
    check(
      row.expected.text,
      row.expected.refs,
      row.expected.authority === "requirement",
    );
}
export function planningSourceRecord(
  candidate,
  catalog,
  version = SOURCE_PLAN_VERSION,
) {
  need([SOURCE_PLAN_VERSION, EXCERPT_PLAN_VERSION].includes(version));
  return {
    schema: version,
    candidate: JSON.parse(JSON.stringify(candidate)),
    catalogSha256: hash(catalog),
  };
}
export function verifyPlanningSourceRecord(result, project) {
  const proof = result.source_projection;
  need(
    exact(proof, ["schema", "candidate", "catalogSha256"]) &&
      [SOURCE_PLAN_VERSION, EXCERPT_PLAN_VERSION].includes(proof.schema) &&
      hash(result.evidence) === proof.catalogSha256,
  );
  need(
    proof.candidate.tests.every((row) => /^T[1-9][0-9]{0,5}$/.test(row.id)) &&
      proof.candidate.objectives.every((row) =>
        /^O[1-9][0-9]{0,5}$/.test(row.id),
      ),
  );
  validatePlanningRelationAuthority(proof.candidate, result.evidence);
  const rendered = mapPlanningText(proof.candidate, (value) =>
    renderSourcePlanText(value, result.evidence, proof.schema),
  );
  const packet = {
    requirement_inventory: result.checks.coverage.requirements.map((row) => ({
      id: row.requirement_id,
    })),
    evidence_catalog: result.evidence,
  };
  const plan = project(rendered, packet);
  need(isDeepStrictEqual(plan, result.plan));
  return plan;
}
export const legacyPlanningNotice =
  "Some saved proposal details lack a matching application source. Review the retained source excerpts before using those details; no action or expected result is inferred.";
export function projectLegacyPlanning(plan, catalog = []) {
  const sources = applicationCatalog(catalog);
  let omitted = false;
  const output = mapPlanningText(plan, (value, role) => {
    if (
      typeof value === "string" &&
      value.length > 0 &&
      sources.some((row) => row.quote.includes(value))
    )
      return value;
    // Known method descriptions retain their exact proposed meaning.
    if (
      role === "method" &&
      ["browser", "api", "source-review", "manual"].includes(value)
    )
      return value;
    omitted = true;
    return role === "expectation"
      ? "The recorded expectation needs review against the retained application sources."
      : role === "step"
        ? "This proposed step needs review against the retained application sources."
        : "This proposal detail needs review against the retained application sources.";
  });
  if (omitted)
    output.limitations = [...output.limitations, legacyPlanningNotice];
  return output;
}
