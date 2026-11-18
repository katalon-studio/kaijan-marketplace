import { requireManagedBinding } from "@katalon-experiments/ai-client";
import {
  sourceGenerationSchema,
  mapPlanningText,
  verifyPlanningSourceRecord,
  projectLegacyPlanning,
  validatePlanningRelationAuthority,
  SOURCE_PLAN_VERSION,
  GENERATED_PLAN_VERSION,
  generatedProposalRecord,
  verifyGeneratedProposalRecord,
  renderSourcePlanText,
} from "./planning-source.mjs";
export { projectLegacyPlanning } from "./planning-source.mjs";
export { resolveApplicationSpan } from "./source-relations.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { encodedJson, utf8 } from "../related/json.mjs";
import { digest, save, validationFailure, pointer } from "./pcf_records.mjs";
import {
  generate,
  MODEL,
  REASONING_EFFORT,
  modelSettings,
} from "./pcf_provider.mjs";
import {
  object,
  strip,
  truth,
  first,
  copy,
  equal,
  splitlines,
  zonedDate,
} from "./semantics.mjs";
import {
  renderPlanningInstructions,
  MODEL_INPUT_INSTRUCTIONS,
  RISK_MODEL_INPUT_INSTRUCTIONS,
} from "./request-instructions.mjs";
import { planningRiskModelView } from "./risk-model-view.mjs";
export { LEDGER_INSTRUCTIONS } from "./prompts.mjs";
export const VERSION = "pr-context-plan/3",
  RELEASE_VERSION = "2026.10.27-3";
export const generationContract = () => ({
  presentation_contract: GENERATED_PLAN_VERSION,
  model: MODEL,
  reasoning_effort: REASONING_EFFORT,
  model_configurable: true,
  reasoning_configurable: true,
  maximum_output_tokens: null,
  maximum_source_corrections: 0,
});
const REF = {
  type: "object",
  properties: { evidence_id: { type: "string" } },
  required: ["evidence_id"],
  additionalProperties: false,
};
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items) => ({ type: "array", items }),
  S = { type: "string" };
export const SCHEMA = obj({
  status: { type: "string", enum: ["proposed_plan", "needs_clarification"] },
  objectives: arr(obj({ id: S, text: S, refs: arr(REF) })),
  ambiguities: arr(S),
  relevant_surfaces: arr(
    obj({
      description: S,
      basis: S,
      refs: arr(REF),
    }),
  ),
  tests: arr(
    obj({
      title: {
        type: "string",
        description:
          "Short action name for this test, using the feature language.",
      },
      method: {
        type: "string",
        description:
          "Proposed verification approach; not an executable operation or execution permission.",
      },
      id: S,
      objective_ids: arr(S),
      priority: S,
      reason: S,
      prerequisites: arr(S),
      steps: arr(S),
      expected: obj({
        text: S,
        authority: S,
        refs: arr(REF),
      }),
      execution_gaps: arr(S),
    }),
  ),
  // Define tests before emitting coverage and handoff references.
  requirement_coverage: arr(
    obj({
      requirement_id: S,
      status: { type: "string", enum: ["proposed", "gap"] },
      test_ids: arr(S),
      reason: S,
    }),
  ),
  disagreements: arr(S),
  runner_handoff: obj({
    status: { type: "string", enum: ["proposed_only"] },
    scenario_ids: arr(S),
    required_inputs: arr(S),
  }),
  limitations: arr(S),
});
const need = (ok, message, context) => {
  if (!ok) throw validationFailure(message, context);
};
export function literalRequirements(packet) {
  return packet.sources
    .filter((s) => s.kind === "intent")
    .map((s) => ({
      id: "R-" + digest([s.id, s.text]).slice(0, 12),
      section: "unsplit intent",
      source_id: s.id,
      quote: s.text,
    }));
}
export function validateCaptureTime(value) {
  need(typeof value === "string", "Missing capture time");
  return zonedDate(value);
}
export function validateInput(packet) {
  need(object(packet), "Input object required");
  need(packet.version === VERSION, "Unsupported input version");
  validateCaptureTime(packet.captured_at);
  need(
    object(packet.work_item) &&
      typeof packet.work_item.title === "string" &&
      strip(packet.work_item.title),
    "Missing supplied work item title",
  );
  const sources = packet.sources;
  need(Array.isArray(sources) && sources.length, "No evidence sources");
  const ids = [];
  for (const source of sources) {
    need(object(source), "Invalid source object");
    need(
      ["intent", "implementation", "context"].includes(source.kind),
      "Unknown evidence kind",
    );
    for (const field of ["id", "uri", "revision", "text"])
      need(
        typeof source[field] === "string" && strip(source[field]),
        "Missing source identity/text",
      );
    ids.push(source.id);
  }
  need(
    new Set(ids).size === ids.length &&
      sources.some((s) => s.kind === "intent"),
    "Duplicate source or no intent source",
  );
  const map = packet.map;
  if ((map ?? null) !== null) {
    need(object(map), "Invalid map metadata");
    for (const field of ["identity", "revision", "coverage", "source_ids"])
      need(truth(map[field]), "Incomplete optional map provenance");
    need(
      Array.isArray(map.source_ids) &&
        map.source_ids.every((i) => ids.includes(i)),
      "Unknown optional map sources",
    );
    need(
      !sources.some(
        (s) => map.source_ids.includes(s.id) && s.kind !== "implementation",
      ),
      "Map cannot be an intent authority",
    );
  }
}
export function validateSchema(value, schema) {
  return validateSchemaAt(value, schema, "");
}
function validateSchemaAt(value, schema, at) {
  if (schema.anyOf) {
    for (const variant of schema.anyOf) {
      try {
        validateSchemaAt(value, variant, at);
        return;
      } catch {
        /* Try only declared variants. */
      }
    }
    need(false, "Unsupported source relation shape", () => ({
      path: at,
      rule: "source_relation_shape",
    }));
  }
  const kind = schema.type;
  need(
    kind === "object"
      ? object(value)
      : kind === "array"
        ? Array.isArray(value)
        : kind === "integer"
          ? Number.isSafeInteger(value)
          : typeof value === "string",
    "Output type mismatch",
    () => ({ path: at, rule: "output_type", expected_type: kind }),
  );
  if (Object.hasOwn(schema, "const"))
    need(value === schema.const, "Unknown source relation", () => ({
      path: at,
      rule: "source_relation_kind",
    }));
  if (kind === "integer")
    need(
      (schema.minimum === undefined || value >= schema.minimum) &&
        (schema.maximum === undefined || value <= schema.maximum),
      "Source span bound is invalid",
      () => ({ path: at, rule: "source_span_bound" }),
    );
  if (schema.pattern)
    need(
      new RegExp(schema.pattern).test(value),
      "Invalid planning identity",
      () => ({ path: at, rule: "planning_identity" }),
    );
  if (kind === "array")
    need(
      (schema.minItems === undefined || value.length >= schema.minItems) &&
        (schema.maxItems === undefined || value.length <= schema.maxItems),
      "Source relation arity is invalid",
      () => ({ path: at, rule: "source_relation_arity" }),
    );
  if (schema.enum)
    need(schema.enum.includes(value), "Unknown output enum", () => ({
      path: at,
      rule: "output_enum",
    }));
  if (kind === "object") {
    for (const [key, child] of Object.entries(schema.properties))
      validateSchemaAt(value[key], child, pointer(at, key));
  }
  if (kind === "array")
    for (const [index, item] of value.entries())
      validateSchemaAt(item, schema.items, pointer(at, index));
}
export function evidenceCatalog(packet) {
  const result = [];
  for (const source of packet.sources)
    splitlines(source.text).forEach((line, index) => {
      if (!strip(line)) return;
      result.push({
        id: "E-" + digest([source.id, index + 1, line]).slice(0, 16),
        source_id: source.id,
        kind: source.kind,
        uri: source.uri,
        revision: source.revision,
        line: index + 1,
        quote: line,
        quote_sha256: createHash("sha256").update(utf8(line)).digest("hex"),
      });
    });
  return result;
}
export function validatePlan(plan, packet) {
  validateInput(packet);
  // Saved plans from before action titles remain valid supplement inputs.
  // New model requests require title through SCHEMA; never rewrite old bytes.
  const schema = structuredClone(SCHEMA);
  if (
    Array.isArray(plan?.tests) &&
    plan.tests.every((test) => object(test) && !Object.hasOwn(test, "title"))
  ) {
    delete schema.properties.tests.items.properties.title;
    schema.properties.tests.items.required =
      schema.properties.tests.items.required.filter((key) => key !== "title");
  }
  validateSchema(plan, schema);
  const computed = evidenceCatalog(packet);
  if (Object.hasOwn(packet, "evidence_catalog"))
    need(
      equal(packet.evidence_catalog, computed),
      "Evidence catalog differs from source",
    );
  const objectives = plan.objectives.map((o) => o.id),
    tests = plan.tests.map((t) => t.id);
  const handoff = plan.runner_handoff.scenario_ids;
  const inventory = Object.hasOwn(packet, "requirement_inventory")
    ? packet.requirement_inventory
    : literalRequirements(packet);
  if (Object.hasOwn(packet, "requirement_inventory"))
    need(
      equal(inventory, literalRequirements(packet)),
      "Requirement ledger differs from original evidence",
    );
  const rows = plan.requirement_coverage;
  const byId = new Map(rows.map((row) => [row.requirement_id, row])),
    missingRequirements = inventory
      .filter((row) => !byId.has(row.id))
      .map((row) => row.id),
    missingHandoff = tests.filter((id) => !handoff.includes(id));
  const coverage = {
    method: "planning-membership-coverage/1",
    origin: "host_derived_from_validated_input_and_model_membership",
    status:
      missingRequirements.length || missingHandoff.length
        ? "partial"
        : "complete",
    interpretation:
      "Membership only; source/test relations remain model assertions. No semantic completeness, execution readiness or observed test result.",
    requirements: inventory.map((row) => ({
      requirement_id: row.id,
      source_id: row.source_id,
      status: byId.has(row.id) ? "reported" : "unassessed",
      model_status: byId.has(row.id) ? byId.get(row.id).status : null,
    })),
    unassessed_requirement_ids: missingRequirements,
    runner_handoff: {
      reported_scenario_ids: [...handoff],
      order_origin: "supplied_plan_reference_order",
      omitted_test_ids: missingHandoff,
      membership: tests.map((id) => ({
        test_id: id,
        status: handoff.includes(id) ? "selected" : "not_selected",
      })),
      execution: "not_executed_readiness_unverified",
    },
  };
  return {
    version: "pr-context-plan-result/5",
    status:
      coverage.status === "partial"
        ? "structurally_valid_partial"
        : "structurally_valid",
    verification_method_contract:
      "proposed_description_not_execution_operation",
    semantic_support: "requires_review",
    coverage,
    executed: false,
    tests: tests.length,
    objectives: objectives.length,
  };
}
export function suppliedInput(value) {
  if (
    !object(value) ||
    Object.hasOwn(value, "version") ||
    Object.hasOwn(value, "sources") ||
    !["title", "body", "url"].every((k) => Object.hasOwn(value, k))
  )
    return value;
  need(
    ["title", "body", "url"].every((k) => typeof value[k] === "string"),
    "Supplied title/body/url must be strings",
  );
  need(
    (value.map ?? null) === null,
    "Use an explicit versioned packet for map input",
  );
  const item = copy(value),
    source = {
      id: "work-item",
      kind: "intent",
      uri: value.url,
      revision: first(
        value.updated_at,
        value.revision,
        "caller-supplied-unversioned",
      ),
      text: value.title + "\n" + value.body,
      authority_limit:
        "Caller-supplied work-item intent and author claims; no authorship, freshness or correctness proof.",
    };
  const claims = ["user", "author"]
    .filter((k) => truth(value[k]))
    .map((k) => [k, value[k]]);
  let copied = null;
  if (claims.length && claims.every(([, v]) => equal(v, claims[0][1]))) {
    const [key, author] = claims[0];
    if (typeof author === "string" || object(author)) {
      source[key] = copy(author);
      copied = key;
    }
  }
  const packet = {
    version: VERSION,
    captured_at: Object.hasOwn(value, "captured_at")
      ? value.captured_at
      : new Date().toISOString(),
    work_item: item,
    sources: [source],
    map: null,
    input_projection: {
      kind: "supplied_work_item",
      original_object_sha256: digest(value),
      text_projection: "complete title + newline + complete body",
      copied_author_claim: copied,
      authorship_proven: false,
      unpropagated_conflicting_claims: claims.length > 1 && copied === null,
    },
    omissions: [
      "Only supplied original work-item content; no GitHub, linked source, comments or application map acquired.",
    ],
  };
  validateInput(packet);
  return packet;
}
export function prepare(packet) {
  packet = suppliedInput(packet);
  validateInput(packet);
  packet = copy(packet);
  packet.requirement_inventory = literalRequirements(packet);
  packet.evidence_catalog = evidenceCatalog(packet);
  return packet;
}
export function schemaFor() {
  return copy(SCHEMA);
}
// Generation stores each membership beside the complete test. Public plans keep
// their existing shape; old plans still use the independent validator above.
function generationShape(schema) {
  const value = copy(schema);
  // Retain the generator's outline separately from the full test definitions.
  const properties = {};
  for (const [key, property] of Object.entries(value.properties)) {
    if (key === "tests")
      properties.test_outline = arr(obj({ id: S, purpose: S }));
    properties[key] = property;
  }
  value.properties = properties;
  value.required = Object.keys(properties);
  const test = value.properties.tests.items;
  test.properties.requirement_ids = arr(S);
  test.properties.runner_selection = {
    type: "string",
    enum: ["selected", "not_selected"],
  };
  test.required.push("requirement_ids", "runner_selection");
  const row = value.properties.requirement_coverage.items;
  delete row.properties.status;
  delete row.properties.test_ids;
  row.required = ["requirement_id", "reason"];
  delete value.properties.runner_handoff.properties.scenario_ids;
  value.properties.runner_handoff.required = ["status", "required_inputs"];
  return value;
}
export function generationSchemaFor(packet, version = GENERATED_PLAN_VERSION) {
  const schema = generationShape(schemaFor(packet));
  return sourceGenerationSchema(schema, packet.evidence_catalog, version);
}
export function projectGeneratedSourcePlan(
  value,
  packet,
  version = SOURCE_PLAN_VERSION,
) {
  validateSchema(value, generationSchemaFor(packet, version));
  if (version === GENERATED_PLAN_VERSION)
    return projectGeneratedPlan(value, packet);
  validatePlanningRelationAuthority(value, packet.evidence_catalog);
  return projectGeneratedPlan(
    mapPlanningText(value, (text) =>
      renderSourcePlanText(text, packet.evidence_catalog, version),
    ),
    packet,
  );
}
/** Called only by a scoped retained-answer reader. This function verifies the
 * source projection; it does not authenticate arbitrary imported results. */
export const planningInputHash = digest;
export function customerPlanFromRetained(result, input) {
  const packet = prepare(input);
  need(
    equal(result.evidence, packet.evidence_catalog),
    "Saved planning sources do not match the original input",
  );
  need(
    equal(result.checks, validatePlan(result.plan, packet)),
    "Saved planning checks do not match the original input",
  );
  if (result.source_projection?.schema === GENERATED_PLAN_VERSION)
    return verifyGeneratedProposalRecord(result, (candidate) =>
      projectGeneratedSourcePlan(candidate, packet, GENERATED_PLAN_VERSION),
    );
  return result.source_projection
    ? verifyPlanningSourceRecord(result, projectGeneratedPlan)
    : projectLegacyPlanning(result.plan, result.evidence);
}
export function projectGeneratedPlan(value) {
  validateSchema(value, generationShape(SCHEMA));
  // copy handles the lossless JSON parser's values. Never mutate provider data.
  const projected = copy(value);
  delete projected.test_outline;
  for (const test of projected.tests) {
    delete test.requirement_ids;
    delete test.runner_selection;
  }
  projected.requirement_coverage = value.requirement_coverage.map((row) => {
    const ids = value.tests
      .filter((test) => test.requirement_ids.includes(row.requirement_id))
      .map((test) => test.id);
    return {
      ...copy(row),
      status: ids.length ? "proposed" : "gap",
      test_ids: ids,
    };
  });
  projected.runner_handoff.scenario_ids = value.tests
    .filter((test) => test.runner_selection === "selected")
    .map((test) => test.id);
  return projected;
}
/** Only the model view changes. Original input and retained proof stay complete. */
function planningSourceTextModelInput(prepared) {
  if (
    Object.hasOwn(prepared, "model_input_version") ||
    prepared.sources.some((source) =>
      Object.hasOwn(source, "text_from_evidence_id"),
    )
  )
    return prepared;
  const view = copy(prepared);
  let changed = false;
  for (const source of view.sources) {
    const rows = view.evidence_catalog.filter(
      (row) =>
        row.source_id === source.id &&
        row.kind === source.kind &&
        row.uri === source.uri &&
        row.revision === source.revision &&
        row.line === 1 &&
        row.quote === source.text &&
        row.quote_sha256 ===
          createHash("sha256").update(utf8(source.text)).digest("hex") &&
        ["authority_limit", "attribution", "provenance"].every(
          (key) => !Object.hasOwn(row, key) || equal(row[key], source[key]),
        ),
    );
    if (
      rows.length !== 1 ||
      typeof rows[0].id !== "string" ||
      view.evidence_catalog.filter((row) => row.id === rows[0].id).length !== 1
    )
      continue;
    delete source.text;
    source.text_from_evidence_id = rows[0].id;
    changed = true;
  }
  if (!changed) return prepared;
  view.model_input_version = "planning-source-text/1";
  // input is itself a JSON string in the wire body. Include that escaping and
  // the extra instruction before accepting a smaller model representation.
  return utf8(encodedJson(encodedJson(view))).length +
    utf8(encodedJson(MODEL_INPUT_INSTRUCTIONS)).length -
    2 <
    utf8(encodedJson(encodedJson(prepared))).length
    ? view
    : prepared;
}

export function planningModelInput(
  prepared,
  version = "planning-source-text/2",
) {
  const original = planningSourceTextModelInput(prepared);
  if (version === "planning-source-text/1") return original;
  if (version !== "planning-source-text/2")
    throw Error("Unsupported planning model-input version");
  const projected = planningRiskModelView(prepared, original);
  if (projected === original) return original;
  const priorInstructions =
    original === prepared ? "" : MODEL_INPUT_INSTRUCTIONS;
  // Compare the complete encoded input and its complete version guidance.
  return utf8(encodedJson(encodedJson(projected))).length +
    utf8(encodedJson(RISK_MODEL_INPUT_INSTRUCTIONS)).length <
    utf8(encodedJson(encodedJson(original))).length +
      utf8(encodedJson(priorInstructions)).length
    ? projected
    : original;
}

/** Omit only an exact duplicate; retained requirement proof stays complete. */
export function planningRequirementModelInput(prepared, modelInput) {
  if (
    Object.hasOwn(prepared, "model_input_version") ||
    Object.hasOwn(prepared, "requirement_input_version") ||
    Object.hasOwn(modelInput, "requirement_input_version") ||
    ![undefined, "planning-source-text/1", "planning-source-text/2"].includes(
      modelInput.model_input_version,
    ) ||
    !equal(prepared.requirement_inventory, literalRequirements(prepared)) ||
    !equal(modelInput.requirement_inventory, prepared.requirement_inventory)
  )
    return modelInput;
  const view = copy(modelInput);
  let changed = false;
  for (const requirement of view.requirement_inventory) {
    const originals = prepared.sources.filter(
      (source) => source.id === requirement.source_id,
    );
    const sources = view.sources.filter(
      (source) => source.id === requirement.source_id,
    );
    if (originals.length !== 1 || sources.length !== 1) continue;
    const original = originals[0],
      source = copy(sources[0]);
    if (
      original.kind !== "intent" ||
      requirement.quote !== original.text ||
      Object.hasOwn(original, "text_from_evidence_id") ||
      Object.hasOwn(original, "context_from_evidence_id")
    )
      continue;
    if (Object.hasOwn(source, "text_from_evidence_id")) {
      const rows = view.evidence_catalog.filter(
        (row) => row.id === source.text_from_evidence_id,
      );
      if (
        rows.length !== 1 ||
        rows[0].source_id !== original.id ||
        rows[0].kind !== original.kind ||
        rows[0].uri !== original.uri ||
        rows[0].revision !== original.revision ||
        rows[0].line !== 1 ||
        rows[0].quote !== original.text ||
        rows[0].quote_sha256 !==
          createHash("sha256").update(utf8(original.text)).digest("hex")
      )
        continue;
      source.text = rows[0].quote;
      delete source.text_from_evidence_id;
    }
    if (!equal(source, original)) continue;
    delete requirement.quote;
    changed = true;
  }
  if (!changed) return modelInput;
  view.requirement_input_version = "source-reference/1";
  const instructions = (input) =>
    renderPlanningInstructions(
      input.model_input_version ?? null,
      input.requirement_input_version ?? null,
    );
  const size = (input) =>
    utf8(encodedJson(encodedJson(input))).length +
    utf8(encodedJson(instructions(input))).length;
  return size(view) < size(modelInput) ? view : modelInput;
}

export function requestFor(
  packet,
  model = MODEL,
  max_output_tokens,
  reasoning = REASONING_EFFORT,
  modelInputVersion = "planning-source-text/2",
) {
  modelSettings({ model, reasoning });
  const prepared = prepare(packet);
  const modelInput = planningRequirementModelInput(
    prepared,
    planningModelInput(prepared, modelInputVersion),
  );
  return [
    prepared,
    {
      model,
      reasoning: { effort: reasoning },
      store: false,
      instructions: renderPlanningInstructions(
        modelInput.model_input_version ?? null,
        modelInput.requirement_input_version ?? null,
      ),
      input: encodedJson(modelInput),
      ...(max_output_tokens === undefined ? {} : { max_output_tokens }),
      text: {
        format: {
          type: "json_schema",
          name: "pr_context_plan",
          strict: true,
          schema: generationSchemaFor(prepared),
        },
      },
    },
  ];
}
export async function plan(packet, output_dir, model, options = {}) {
  const settings = modelSettings(options.modelSettings);
  const [prepared, request] = requestFor(
    packet,
    model ?? settings.model,
    options.max_output_tokens,
    settings.reasoning,
  );
  // The Planner assesses Runner's recap against the privately retained original
  // context. Encrypted reasoning can be replayed without provider-side storage.
  if (options.retainPlannerConversation === true) {
    requireManagedBinding(options.env ?? process.env);
    request.store = false;
    request.include = ["reasoning.encrypted_content"];
  }
  let projected, projection, sourceProjection;
  const result = await generate(
    prepared,
    request,
    output_dir,
    (value) => {
      projected = projectGeneratedSourcePlan(
        value,
        prepared,
        GENERATED_PLAN_VERSION,
      );
      sourceProjection = generatedProposalRecord(
        value,
        prepared.evidence_catalog,
      );
      const checks = validatePlan(projected, prepared);
      projection = {
        version: "test-membership/1",
        candidate_sha256: digest(value),
        plan_sha256: digest(projected),
        links: "derived_from_model_test_membership_in_test_order",
        order_origin: "derived_from_model_test_order",
      };
      save(join(output_dir, "projected-plan.json"), projected);
      save(join(output_dir, "generation-projection.json"), projection);
      return checks;
    },
    options,
  );
  result.plan = projected;
  result.source_projection = sourceProjection;
  result.generation_projection = projection;
  result.evidence = prepared.evidence_catalog;
  if (Object.hasOwn(prepared, "input_projection"))
    result.input_projection = prepared.input_projection;
  return result;
}
