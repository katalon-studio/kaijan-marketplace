import { createHash } from "node:crypto";
import { join } from "node:path";
import { encodedJson, utf8 } from "../related/json.mjs";
import {
  digest,
  save,
  validationFailure,
  pointer,
  referenceDiagnostic,
} from "./pcf_records.mjs";
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
import { SPECIALIZED, METHOD_INSTRUCTIONS } from "./prompts.mjs";
export {
  SPECIALIZED,
  LEDGER_INSTRUCTIONS,
  METHOD_INSTRUCTIONS,
} from "./prompts.mjs";
export const VERSION = "pr-context-plan/3",
  RELEASE_VERSION = "2026.10.27-3";
export const generationContract = () => ({
  model: MODEL,
  reasoning_effort: REASONING_EFFORT,
  model_configurable: true,
  reasoning_configurable: true,
  maximum_output_tokens: 8000,
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
  requirement_coverage: arr(
    obj({
      requirement_id: S,
      status: { type: "string", enum: ["proposed", "gap"] },
      test_ids: arr(S),
      reason: S,
    }),
  ),
  ambiguities: arr(S),
  relevant_surfaces: arr(
    obj({
      description: S,
      basis: { type: "string", enum: ["supplied", "hypothesis"] },
      refs: arr(REF),
    }),
  ),
  tests: arr(
    obj({
      title: {
        type: "string",
        minLength: 1,
        description:
          "Short action name for this test, using the feature language.",
      },
      method: {
        type: "string",
        minLength: 1,
        description:
          "Proposed verification approach; not an executable operation or execution permission.",
      },
      id: S,
      objective_ids: arr(S),
      priority: { type: "string", enum: ["P1", "P2", "P3"] },
      reason: S,
      prerequisites: arr(S),
      steps: arr(S),
      expected: obj({
        text: S,
        authority: { type: "string", enum: ["requirement", "hypothesis"] },
        refs: arr(REF),
      }),
      execution_gaps: arr(S),
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
  const kind = schema.type;
  need(
    kind === "object"
      ? object(value)
      : kind === "array"
        ? Array.isArray(value)
        : typeof value === "string",
    "Output type mismatch",
    () => ({ path: at, rule: "output_type", expected_type: kind }),
  );
  if (schema.enum)
    need(schema.enum.includes(value), "Unknown output enum", () => ({
      path: at,
      rule: "output_enum",
    }));
  if (kind === "string")
    need(strip(value), "Empty output string", () => ({
      path: at,
      rule: "nonempty_string",
    }));
  if (kind === "object") {
    need(
      equal(
        new Set(Object.keys(value)).size,
        Object.keys(schema.properties).length,
      ) && Object.keys(value).every((k) => Object.hasOwn(schema.properties, k)),
      "Output keys mismatch",
      () => ({
        path: at,
        rule: "output_keys",
        missing_keys: Object.keys(schema.properties).filter(
          (key) => !Object.hasOwn(value, key),
        ),
        unexpected_keys: Object.keys(value).filter(
          (key) => !Object.hasOwn(schema.properties, key),
        ),
      }),
    );
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
  const sources = new Map(packet.sources.map((s) => [s.id, s])),
    computed = evidenceCatalog(packet);
  if (Object.hasOwn(packet, "evidence_catalog"))
    need(
      equal(packet.evidence_catalog, computed),
      "Evidence catalog differs from source",
    );
  const catalog = new Map(computed.map((row) => [row.id, row]));
  const refs = (items, at, intent = false, required = false) => {
    need(!required || items.length, "Missing evidence", () => ({
      path: at,
      rule: "nonempty_evidence",
    }));
    for (const [index, item] of items.entries()) {
      const row = catalog.get(item.evidence_id);
      need(row && sources.has(row.source_id), "Unknown evidence ID", () => ({
        path: pointer(pointer(at, index), "evidence_id"),
        rule: "known_evidence_id",
        offending_ids: [item.evidence_id],
      }));
      if (intent)
        need(
          sources.get(row.source_id).kind === "intent",
          "Implementation/context cannot establish intent",
          () => ({
            path: pointer(pointer(at, index), "evidence_id"),
            rule: "intent_authority",
            offending_ids: [item.evidence_id],
            source_id: row.source_id,
          }),
        );
    }
  };
  const objectives = plan.objectives.map((o) => o.id),
    tests = plan.tests.map((t) => t.id);
  need(
    new Set(objectives).size === objectives.length &&
      new Set(tests).size === tests.length,
    "Empty or duplicate objective/test identities",
    () => {
      const duplicateObjectives =
        new Set(objectives).size !== objectives.length;
      const values = duplicateObjectives ? objectives : tests;
      return referenceDiagnostic(
        duplicateObjectives ? "/objectives" : "/tests",
        values,
        values,
      );
    },
  );
  if (!objectives.length || !tests.length)
    need(
      plan.status === "needs_clarification" && plan.ambiguities.length,
      "Empty intentions require explicit clarification",
      () => ({ path: "", rule: "empty_intentions_require_clarification" }),
    );
  for (const [index, objective] of plan.objectives.entries())
    refs(objective.refs, `/objectives/${index}/refs`, true, true);
  for (const [index, surface] of plan.relevant_surfaces.entries())
    refs(
      surface.refs,
      `/relevant_surfaces/${index}/refs`,
      false,
      surface.basis === "supplied",
    );
  for (const [index, test] of plan.tests.entries()) {
    need(
      test.objective_ids.length &&
        test.objective_ids.every((i) => objectives.includes(i)),
      "Unknown or missing test objective",
      () =>
        test.objective_ids.length
          ? referenceDiagnostic(
              `/tests/${index}/objective_ids`,
              test.objective_ids,
              objectives,
              false,
            )
          : {
              path: `/tests/${index}/objective_ids`,
              rule: "nonempty_objective_ids",
            },
    );
    need(test.steps.length, "Missing steps", () => ({
      path: `/tests/${index}/steps`,
      rule: "nonempty_steps",
    }));
    const expectation = test.expected;
    refs(
      expectation.refs,
      `/tests/${index}/expected/refs`,
      expectation.authority === "requirement",
      expectation.authority === "requirement",
    );
  }
  const handoff = plan.runner_handoff.scenario_ids;
  need(
    new Set(handoff).size === handoff.length &&
      handoff.every((i) => tests.includes(i)),
    "Unknown or duplicate Runner handoff scenario",
    () => referenceDiagnostic("/runner_handoff/scenario_ids", handoff, tests),
  );
  const inventory = Object.hasOwn(packet, "requirement_inventory")
    ? packet.requirement_inventory
    : literalRequirements(packet);
  if (Object.hasOwn(packet, "requirement_inventory"))
    need(
      equal(inventory, literalRequirements(packet)),
      "Requirement ledger differs from original evidence",
    );
  const rows = plan.requirement_coverage,
    ids = rows.map((r) => r.requirement_id);
  need(
    new Set(ids).size === ids.length &&
      ids.every((i) => inventory.some((r) => r.id === i)),
    "Unknown or duplicate requirement coverage ledger",
    () =>
      referenceDiagnostic(
        "/requirement_coverage",
        ids,
        inventory.map((row) => row.id),
      ),
  );
  for (const [index, row] of rows.entries()) {
    need(
      row.test_ids.every((i) => tests.includes(i)) &&
        new Set(row.test_ids).size === row.test_ids.length,
      "Unknown or duplicate coverage scenario",
      () =>
        referenceDiagnostic(
          `/requirement_coverage/${index}/test_ids`,
          row.test_ids,
          tests,
          false,
        ),
    );
    need(
      Boolean(row.test_ids.length) === (row.status === "proposed"),
      "Coverage gap must have no tests; proposed coverage needs tests",
      () => ({
        path: `/requirement_coverage/${index}/test_ids`,
        rule: "coverage_status_membership",
        requirement_id: row.requirement_id,
      }),
    );
  }
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
export function schemaFor(packet) {
  const schema = copy(SCHEMA),
    ids = packet.evidence_catalog.map((row) => row.id),
    inventoryIds = packet.requirement_inventory.map((row) => row.id);
  const bind = (node) => {
    if (object(node)) {
      for (const [key, value] of Object.entries(node.properties ?? {})) {
        if (key === "evidence_id") value.enum = ids;
        if (key === "requirement_id") value.enum = inventoryIds;
      }
      for (const value of Object.values(node)) bind(value);
    } else if (Array.isArray(node)) for (const value of node) bind(value);
  };
  bind(schema);
  const intentIds = packet.evidence_catalog
    .filter((row) => row.kind === "intent")
    .map((row) => row.id);
  schema.properties.objectives.items.properties.refs.items.properties.evidence_id.enum =
    intentIds;
  // Constrain generation without changing saved plans or the validation guard.
  // Context can support a proposed check, but cannot establish a requirement.
  const expected = schema.properties.tests.items.properties.expected;
  const requirement = copy(expected),
    hypothesis = copy(expected);
  requirement.properties.authority.enum = ["requirement"];
  requirement.properties.refs.minItems = 1;
  requirement.properties.refs.items.properties.evidence_id.enum = intentIds;
  hypothesis.properties.authority.enum = ["hypothesis"];
  schema.properties.tests.items.properties.expected = {
    anyOf: [requirement, hypothesis],
  };
  return schema;
}
// Generation stores each membership beside the complete test. Public plans keep
// their existing shape; old plans still use the independent validator above.
function generationShape(schema) {
  const value = copy(schema);
  // Keep an independent declaration before full definitions. Projection must
  // not conceal an intended test whose body is missing from generation.
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
export function generationSchemaFor(packet) {
  const schema = generationShape(schemaFor(packet));
  schema.properties.tests.items.properties.requirement_ids.items = {
    type: "string",
    enum: packet.requirement_inventory.map((row) => row.id),
  };
  return schema;
}
export function projectGeneratedPlan(value, packet) {
  validateSchema(value, generationShape(SCHEMA));
  const outlined = value.test_outline.map((test) => test.id);
  const defined = value.tests.map((test) => test.id);
  need(
    new Set(outlined).size === outlined.length &&
      outlined.length === defined.length &&
      outlined.every((id) => defined.includes(id)) &&
      defined.every((id) => outlined.includes(id)),
    "Test outline and full definitions do not match",
    () => ({
      path: "/test_outline",
      rule: "complete_test_definitions",
      missing_test_ids: outlined.filter((id) => !defined.includes(id)),
      undeclared_test_ids: defined.filter((id) => !outlined.includes(id)),
    }),
  );
  const inventory = packet.requirement_inventory.map((row) => row.id);
  const reported = value.requirement_coverage.map((row) => row.requirement_id);
  for (const [index, test] of value.tests.entries()) {
    need(
      new Set(test.requirement_ids).size === test.requirement_ids.length &&
        test.requirement_ids.every(
          (id) => inventory.includes(id) && reported.includes(id),
        ),
      "Unknown, duplicate or unreported test requirement",
      () =>
        referenceDiagnostic(
          `/tests/${index}/requirement_ids`,
          test.requirement_ids,
          inventory.filter((id) => reported.includes(id)),
        ),
    );
  }
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
const GENERATION_MEMBERSHIP_INSTRUCTIONS =
  "\nThe host supplies requirement_inventory entries containing complete intent sources. They are a source checklist, not proof of semantic coverage. Consider all supplied intent. First list every distinct functional and change-impact check in test_outline with its ID and purpose. Then write one complete test definition for each outlined ID, with no missing or extra definitions. Do not remove distinct checks to make the lists fit. Each test's requirement_ids names the supplied entries it checks; runner_selection states selected or not_selected. Return one requirement_coverage row per inventory entry, with a reason explaining coverage or the gap. Do not repeat test IDs in coverage or handoff. The host derives their links from these exact definitions in test order. Keep all test content, including tests not selected for Runner. An empty membership is a gap, not permission to invent behavior. Explicit implementation requirements need source checks or a stated gap; visual similarity cannot prove source ownership. Do not invent thresholds or expected behavior. Use concise wording while preserving distinct conditions, prerequisites, actions, observable expectations, source authority and missing inputs.";

export function requestFor(
  packet,
  model = MODEL,
  max_output_tokens = 8000,
  reasoning = REASONING_EFFORT,
) {
  modelSettings({ model, reasoning });
  const prepared = prepare(packet);
  return [
    prepared,
    {
      model,
      reasoning: { effort: reasoning },
      store: false,
      instructions:
        SPECIALIZED + METHOD_INSTRUCTIONS + GENERATION_MEMBERSHIP_INSTRUCTIONS,
      input: encodedJson(prepared),
      max_output_tokens,
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
    options.max_output_tokens ?? 8000,
    settings.reasoning,
  );
  let projected, projection;
  const result = await generate(
    prepared,
    request,
    output_dir,
    (value) => {
      projected = projectGeneratedPlan(value, prepared);
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
  result.generation_projection = projection;
  result.evidence = prepared.evidence_catalog;
  if (Object.hasOwn(prepared, "input_projection"))
    result.input_projection = prepared.input_projection;
  return result;
}
