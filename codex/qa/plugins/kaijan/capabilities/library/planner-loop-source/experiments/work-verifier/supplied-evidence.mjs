import { modelSettings } from "../context-finder/planning/pcf_provider.mjs";
import { renderAssessmentInstructions } from "./request-instructions.mjs";
import { compactRequestSchema } from "./request-schema.mjs";
import {
  findingRecordLinkSchemas,
  flattenFindingRecordLinks,
} from "./finding-record-links.mjs";

// The historical field names are retained record metadata. This value selects
// the current response representation, never a historical wording template.
const CURRENT_ASSESSMENT_FORMAT = 13;
// Explicit supplied-result assessment. No capture, artifact reads or execution.
import assert from "node:assert/strict";
import { assessPreparedSuppliedEvidence } from "./assessment-runtime.mjs";
import { createHash } from "node:crypto";
import {
  captureWorkItemSources,
  bindCapturedSourcePointer,
  reviewSchemaErrors,
  SOURCE_BOUND_REVIEW,
} from "./source-binding.mjs";
import { encodedJson, utf8 } from "../context-finder/related/json.mjs";
import {
  constrainStepObservationSources,
  stepObservationSourceIds,
} from "./step-observation-sources.mjs";
import { constrainStepActionSources } from "./step-action-sources.mjs";

import {
  SUPPLIED_TEST_EVIDENCE,
  SUPPLIED_ASSESSMENT,
  MODEL,
  LIMITS,
} from "./assessment-contract.mjs";
export { SUPPLIED_TEST_EVIDENCE, SUPPLIED_ASSESSMENT, MODEL, LIMITS };
const hash = (value) => createHash("sha256").update(value).digest("hex");
// The existing exact-source binder uses structuredClone, so retain ordinary
// lossless JSON here rather than the codec's metadata-preserving proxy objects.
const clone = (value) => JSON.parse(JSON.stringify(value));
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : object(value)
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const exact = (value, keys) =>
  object(value) && Object.keys(value).every((key) => keys.includes(key));
const nullableObject = (value) => value === null || object(value);
const pngSize = (bytes) => {
  assert(
    bytes.length >= 33 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.toString("ascii", 12, 16) === "IHDR",
    "PNG image required",
  );
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  assert(
    width > 0 &&
      height > 0 &&
      width * height <= 40000000 &&
      bytes.length <= 2 * 1024 * 1024,
    "Bounded PNG image required",
  );
  return { width, height };
};
const recordArray = (values, label) => {
  assert(Array.isArray(values), label + " array required");
  const ids = new Set();
  for (const value of values) {
    assert(
      object(value) && nonempty(value.id) && !ids.has(value.id),
      label + " unique IDs required",
    );
    assert.equal(
      typeof value.text,
      "string",
      label + " original text required",
    );
    assert(
      nullableObject(value.provenance),
      label + " provenance must be supplied or null",
    );
    ids.add(value.id);
  }
};

export function validateSuppliedEvidence(input) {
  assert(
    exact(input, [
      "schema",
      "work_item",
      "requirements",
      "proposed_tests",
      "outcomes",
      "evidence",
      "target",
      "provenance",
    ]),
    "Explicit supplied-evidence input required",
  );
  assert.equal(input.schema, SUPPLIED_TEST_EVIDENCE);
  assert(object(input.work_item), "Original work item required");
  assert.equal(typeof input.work_item.title, "string");
  assert.equal(typeof input.work_item.body, "string");
  assert(nullableObject(input.work_item.provenance));
  assert(
    input.requirements === null || Array.isArray(input.requirements),
    "Declare requirement records or null",
  );
  if (input.requirements !== null)
    recordArray(input.requirements, "Requirements");
  assert(
    input.proposed_tests === null || Array.isArray(input.proposed_tests),
    "Declare proposed tests or null; no fake plan",
  );
  if (input.proposed_tests !== null)
    recordArray(input.proposed_tests, "Proposed tests");
  recordArray(input.outcomes, "Returned outcomes");
  for (const outcome of input.outcomes) {
    assert(outcome.test_id === null || nonempty(outcome.test_id));
    assert(nonempty(outcome.status), "Preserve the caller's reported status");
    assert(
      Array.isArray(outcome.evidence_ids) &&
        outcome.evidence_ids.every(nonempty),
    );
  }
  assert(Array.isArray(input.evidence));
  const ids = new Set();
  for (const evidence of input.evidence) {
    assert(object(evidence) && nonempty(evidence.id) && !ids.has(evidence.id));
    ids.add(evidence.id);
    assert(evidence.text === null || typeof evidence.text === "string");
    assert(
      evidence.bytes_base64 === null ||
        typeof evidence.bytes_base64 === "string",
    );
    assert(
      nullableObject(evidence.reference) && nullableObject(evidence.provenance),
    );
    assert(
      evidence.text !== null ||
        evidence.bytes_base64 !== null ||
        evidence.reference !== null,
      "Supply evidence or an explicitly unresolved reference",
    );
    if (evidence.bytes_base64 !== null) {
      const bytes = Buffer.from(evidence.bytes_base64, "base64");
      if (evidence.media_type !== undefined) {
        assert.equal(evidence.media_type, "image/png");
        pngSize(bytes);
      }
      assert.equal(
        bytes.toString("base64"),
        evidence.bytes_base64,
        "Canonical base64 bytes required",
      );
      if (evidence.sha256 !== undefined)
        assert.equal(
          hash(bytes),
          evidence.sha256,
          "Supplied byte hash differs",
        );
    } else if (evidence.media_type !== undefined) {
      assert.fail("Image evidence needs supplied bytes");
    } else if (evidence.sha256 !== undefined && evidence.text !== null)
      assert.equal(
        hash(utf8(evidence.text)),
        evidence.sha256,
        "Supplied text hash differs",
      );
  }
  assert(nullableObject(input.target) && nullableObject(input.provenance));
  const declaredBindings = input.provenance?.testOutcomeBindings;
  if (declaredBindings !== undefined) {
    assert(
      Array.isArray(declaredBindings),
      "Declared test/outcome bindings array required",
    );
    const testIds = new Set([
      ...(input.proposed_tests ?? []).map((test) => test.id),
      ...input.outcomes
        .map((outcome) => outcome.test_id)
        .filter((id) => id !== null),
    ]);
    const outcomeIds = new Set(input.outcomes.map((outcome) => outcome.id));
    const boundTests = new Set();
    for (const binding of declaredBindings) {
      assert(
        exact(binding, ["testId", "outcomeIds", "evidenceIds"]) &&
          testIds.has(binding.testId) &&
          !boundTests.has(binding.testId),
        "Declared binding needs one known test ID",
      );
      boundTests.add(binding.testId);
      assert(
        Array.isArray(binding.outcomeIds) &&
          binding.outcomeIds.length &&
          new Set(binding.outcomeIds).size === binding.outcomeIds.length &&
          binding.outcomeIds.every((id) => outcomeIds.has(id)),
        "Declared binding needs exact supplied outcome IDs",
      );
      assert(
        Array.isArray(binding.evidenceIds) &&
          new Set(binding.evidenceIds).size === binding.evidenceIds.length &&
          binding.evidenceIds.every((id) => ids.has(id)),
        "Declared binding needs exact supplied evidence IDs",
      );
    }
  }
  assert(
    nonempty(input.work_item.title) ||
      nonempty(input.work_item.body) ||
      input.requirements?.length,
    "Supplied intent required",
  );
  // The existing exact-source binder owns the lossless JSON/text boundary too.
  assert.deepEqual(
    JSON.parse(JSON.stringify(input)),
    input,
    "Lossless plain JSON required",
  );
  return input;
}

const scalar = { type: "string" };
const arr = (items, maxItems) => ({ type: "array", items, maxItems });
const obj = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const idsSchema = (ids) =>
  arr(ids.length ? { type: "string", enum: ids } : scalar, ids.length || 0);

const legacyCitationSchema = (sourceIds) =>
  obj({
    source_id: { type: "string", enum: sourceIds },
    from_line: { type: "integer", minimum: 1 },
    through_line: { type: "integer", minimum: 1 },
  });

function boundedCitationSchema(views) {
  const groups = new Map();
  for (const view of views) {
    const count = view.lines.length;
    // Empty sources have no offered lines and cannot be cited.
    if (!count) continue;
    if (!groups.has(count)) groups.set(count, []);
    groups.get(count).push(view.source_id);
  }
  // The nonempty work item and submission inventory always offer a source.
  assert(groups.size, "Citations need a nonempty source");
  return {
    anyOf: [...groups].map(([count, sourceIds]) =>
      obj({
        source_id: { type: "string", enum: sourceIds },
        from_line: { type: "integer", minimum: 1, maximum: count },
        through_line: { type: "integer", minimum: 1, maximum: count },
      }),
    ),
  };
}

// A Runner scenario is not another test when its exact Plan selection is
// already represented by explicit bindings. Preserve uncertain identities.
function boundPlanScenario(input, outcome, bindings) {
  const tests = input.proposed_tests ?? [];
  if (
    outcome.test_id === null ||
    tests.some((test) => test.id === outcome.test_id) ||
    outcome.provenance?.scenarioId !== outcome.test_id
  )
    return false;
  const plan = outcome.provenance?.planRef;
  if (
    !object(plan) ||
    !nonempty(plan.answerId) ||
    !nonempty(plan.resultSha256) ||
    !Array.isArray(plan.selectedTestIds) ||
    !plan.selectedTestIds.length ||
    !plan.selectedTestIds.every(nonempty) ||
    new Set(plan.selectedTestIds).size !== plan.selectedTestIds.length
  )
    return false;
  return plan.selectedTestIds.every((testId) => {
    const test = tests.find((test) => test.id === testId);
    const provenance = test?.provenance;
    const answerIds = [provenance?.planAnswerId, provenance?.answerId].filter(
      (id) => id !== undefined,
    );
    return (
      answerIds.length > 0 &&
      answerIds.every((id) => id === plan.answerId) &&
      provenance.resultSha256 === plan.resultSha256 &&
      bindings.some(
        (binding) =>
          binding.testId === testId && binding.outcomeIds.includes(outcome.id),
      )
    );
  });
}

// Use the same membership rules for required response slots and projection.
function testResultGroups(input) {
  const groups = new Map();
  const declaredBindings = input.provenance?.testOutcomeBindings ?? [];
  const boundOutcomeIds = new Set(
    declaredBindings.flatMap((binding) => binding.outcomeIds),
  );
  const groupFor = (key, testId) => {
    if (!groups.has(key))
      groups.set(key, {
        test_id: testId,
        test: null,
        outcomes: [],
        evidenceIds: new Set(),
        declared: null,
      });
    return groups.get(key);
  };
  for (const test of input.proposed_tests ?? [])
    groupFor(test.id, test.id).test = test;
  for (const outcome of input.outcomes) {
    // Keep the original outcome; only its separate result slot is redundant.
    if (
      (outcome.test_id === null && boundOutcomeIds.has(outcome.id)) ||
      boundPlanScenario(input, outcome, declaredBindings)
    )
      continue;
    const group = groupFor(outcome.test_id ?? outcome, outcome.test_id);
    group.outcomes.push(outcome);
    outcome.evidence_ids.forEach((id) => group.evidenceIds.add(id));
  }
  for (const binding of declaredBindings) {
    const group = groupFor(binding.testId, binding.testId);
    group.declared = binding;
    for (const outcome of input.outcomes.filter((outcome) =>
      binding.outcomeIds.includes(outcome.id),
    ))
      if (!group.outcomes.some((existing) => existing.id === outcome.id))
        group.outcomes.push(outcome);
    binding.evidenceIds.forEach((id) => group.evidenceIds.add(id));
  }
  return [...groups.values()];
}

// The current report-oriented request reuses the same original test grouping.
export { testResultGroups as suppliedAssessmentGroups };

// These records describe supplied actions, not authenticated application effects.
const actionTypes = new Set([
  "click",
  "double_click",
  "move",
  "scroll",
  "keypress",
  "type",
  "drag",
  "wait",
  "screenshot",
]);
const actionStates = new Set(["invoked", "returned", "error"]);
const validDate = (value) =>
  typeof value === "string" &&
  value.length <= 64 &&
  /^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value.slice(0, 10)).toISOString().slice(0, 10) ===
    value.slice(0, 10);

function selectedAction(value) {
  if (!object(value) || !actionTypes.has(value.type)) return null;
  const result = { type: value.type };
  for (const key of ["x", "y", "scroll_x", "scroll_y"])
    if (value[key] !== undefined) {
      if (typeof value[key] !== "number" || !Number.isFinite(value[key]))
        return null;
      result[key] = value[key];
    }
  if (value.text !== undefined) {
    if (typeof value.text !== "string") return null;
    result.text = value.text;
  }
  if (value.keys !== undefined) {
    if (
      !Array.isArray(value.keys) ||
      !value.keys.every((key) => typeof key === "string")
    )
      return null;
    result.keys = clone(value.keys);
  }
  if (value.button !== undefined) {
    if (!["left", "right", "middle", "back", "forward"].includes(value.button))
      return null;
    result.button = value.button;
  }
  if (value.path !== undefined) {
    if (!Array.isArray(value.path)) return null;
    const path = value.path.map((point) =>
      Array.isArray(point) && point.length === 2
        ? point
        : object(point)
          ? [point.x, point.y]
          : null,
    );
    if (
      path.some(
        (point) =>
          !point ||
          point.some((n) => typeof n !== "number" || !Number.isFinite(n)),
      )
    )
      return null;
    result.path = path;
  }
  return result;
}
function sourceActions(prepared) {
  return prepared.capture.state.suppliedSources.flatMap((source) => {
    const reported = source.provenance?.reported;
    if (
      source.kind !== "execution_record" ||
      source.provenance?.role !== "evidence_text" ||
      reported?.source !== "application-evidence-projection" ||
      reported.schema !== "kaijan.application-evidence/1" ||
      reported.kind !== "application-artifact" ||
      reported.textSha256 !== source.sha256 ||
      hash(source.text) !== source.sha256
    )
      return [];
    let value;
    try {
      value = JSON.parse(source.text);
    } catch {
      return [];
    }
    if (!Array.isArray(value.actions)) return [];
    const indexes = new Set();
    const rows = [];
    for (const row of value.actions) {
      if (!object(row)) return [];
      const action = selectedAction(row.action);
      if (
        !Number.isSafeInteger(row.index) ||
        row.index < 1 ||
        indexes.has(row.index) ||
        !action ||
        !actionStates.has(row.status) ||
        !validDate(row.startedAt) ||
        (row.endedAt !== undefined &&
          (!validDate(row.endedAt) ||
            Date.parse(row.endedAt) < Date.parse(row.startedAt)))
      )
        return [];
      indexes.add(row.index);
      rows.push({
        source_id: source.id,
        source_sha256: source.sha256,
        evidence_id: source.provenance.original_id,
        action_index: row.index,
        action,
        status: row.status,
        started_at: row.startedAt,
        ...(row.endedAt === undefined ? {} : { ended_at: row.endedAt }),
      });
    }
    return rows.sort((a, b) => a.action_index - b.action_index);
  });
}
function exactResultGroup(prepared, testId, outcomeIds) {
  if (
    !Array.isArray(outcomeIds) ||
    new Set(outcomeIds).size !== outcomeIds.length
  )
    return undefined;
  return testResultGroups(prepared.input).find(
    (group) =>
      group.test_id === testId &&
      group.outcomes.length === outcomeIds.length &&
      group.outcomes.every((outcome) => outcomeIds.includes(outcome.id)),
  );
}
export function assessmentActionCatalog(prepared, testId, outcomeIds) {
  const group = exactResultGroup(prepared, testId, outcomeIds);
  return group
    ? sourceActions(prepared).filter((row) =>
        group.evidenceIds.has(row.evidence_id),
      )
    : [];
}
/** Rebind against original input every time. Serialized bound markers are not proof. */
export function bindAssessmentStepFacts(prepared, testId, outcomeIds, step) {
  const group = exactResultGroup(prepared, testId, outcomeIds),
    errors = [],
    actions = [],
    observations = [];
  const catalog = assessmentActionCatalog(prepared, testId, outcomeIds);
  if (!group) errors.push("step_outcome_membership_mismatch");
  const seenActions = new Set(),
    seenSources = new Set();
  if (
    !Array.isArray(step.action_refs) ||
    !Array.isArray(step.source_refs) ||
    !["recorded_action", "reported_observation", "unresolved"].includes(
      step.qualification,
    )
  )
    errors.push("step_facts_missing");
  for (const ref of Array.isArray(step.action_refs) ? step.action_refs : []) {
    if (!object(ref)) {
      errors.push("step_action_not_in_selected_outcomes");
      continue;
    }
    const key = JSON.stringify([ref.source_id, ref.action_index]);
    const action = catalog.find(
      (row) =>
        row.source_id === ref.source_id &&
        row.action_index === ref.action_index,
    );
    if (!action || seenActions.has(key))
      errors.push("step_action_not_in_selected_outcomes");
    else actions.push(action);
    seenActions.add(key);
  }
  for (const ref of Array.isArray(step.source_refs) ? step.source_refs : []) {
    if (!object(ref)) {
      errors.push("step_source_not_in_selected_observations");
      continue;
    }
    const source = prepared.capture.state.suppliedSources.find(
      (source) => source.id === ref.source_id,
    );
    const key = JSON.stringify([ref.source_id, ref.start_utf16, ref.end_utf16]);
    const reported = source?.provenance?.reported;
    const application =
      reported?.source === "application-evidence-projection" &&
      reported.schema === "kaijan.application-evidence/1" &&
      ["application-page", "application-artifact"].includes(reported.kind) &&
      reported.textSha256 === source.sha256;
    const caller =
      reported === null ||
      ["caller-assertion", "caller-supplied-runner-scenario"].includes(
        reported?.source,
      );
    if (
      !source ||
      source.provenance?.role !== "evidence_text" ||
      !group?.evidenceIds.has(source.provenance.original_id) ||
      (!application && !caller) ||
      seenSources.has(key) ||
      !Number.isSafeInteger(ref.start_utf16) ||
      !Number.isSafeInteger(ref.end_utf16) ||
      ref.start_utf16 < 0 ||
      ref.end_utf16 <= ref.start_utf16 ||
      ref.end_utf16 > source.text.length
    ) {
      errors.push("step_source_not_in_selected_observations");
      continue;
    }
    seenSources.add(key);
    const binding = bindCapturedSourcePointer(prepared.capture, {
      sourceId: source.id,
      sourceSha256: source.sha256,
      startUtf16: ref.start_utf16,
      endUtf16: ref.end_utf16,
    });
    if (binding.status !== "bound") errors.push("step_source_span_invalid");
    else observations.push(binding);
  }
  if (step.qualification === "recorded_action" && !actions.length)
    errors.push("step_action_required");
  if (
    step.qualification === "reported_observation" &&
    (actions.length || !observations.length)
  )
    errors.push("step_observation_required");
  if (
    step.qualification === "unresolved" &&
    (actions.length || observations.length)
  )
    errors.push("step_unresolved_has_claimed_facts");
  actions.sort((a, b) => catalog.indexOf(a) - catalog.indexOf(b));
  return {
    state:
      errors.length || step.qualification === "unresolved"
        ? "unresolved"
        : "bound",
    qualification: [
      "recorded_action",
      "reported_observation",
      "unresolved",
    ].includes(step.qualification)
      ? step.qualification
      : "unresolved",
    actions: errors.length ? [] : actions,
    observations: errors.length ? [] : observations,
    errors,
    meaning:
      "References establish membership in supplied records, not completed actions, semantic support or cross-source chronology.",
  };
}

// Version 8 constrains new generation, not saved candidates. The literal binder
// still checks source membership and offsets after generation.
function boundStepSchema(step, required) {
  if (!required) return step;
  return {
    anyOf: ["recorded_action", "reported_observation", "unresolved"].map(
      (qualification) => {
        const variant = clone(step);
        variant.properties.qualification.enum = [qualification];
        if (qualification === "recorded_action")
          variant.properties.action_refs.minItems = 1;
        else variant.properties.action_refs.maxItems = 0;
        if (qualification === "reported_observation")
          variant.properties.source_refs.minItems = 1;
        else if (qualification === "unresolved")
          variant.properties.source_refs.maxItems = 0;
        return variant;
      },
    ),
  };
}

function testResultSchema(
  citation,
  testIds,
  outcomeIds,
  stepFacts = false,
  declaredLinkCitation = null,
  requireStepBindings = false,
) {
  return obj({
    test_id: {
      anyOf: [
        { type: "null" },
        ...(testIds.length ? [{ type: "string", enum: testIds }] : []),
      ],
    },
    outcome_ids: idsSchema(outcomeIds),
    verdict: { type: "string", enum: ["pass", "fail", "inconclusive"] },
    basis: {
      type: "string",
      enum: ["observed_evidence", "reported_only", "missing_evidence"],
    },
    actual: scalar,
    reason: scalar,
    citations: arr(citation, LIMITS.citations),
    ...(declaredLinkCitation
      ? { declared_link_citation: declaredLinkCitation }
      : {}),
    observed_steps: arr(
      boundStepSchema(
        obj({
          description: scalar,
          citations: arr(citation, LIMITS.citations),
          ...(stepFacts
            ? {
                action_refs: arr(
                  obj({
                    source_id: scalar,
                    action_index: { type: "integer", minimum: 1 },
                  }),
                  256,
                ),
                source_refs: arr(
                  obj({
                    source_id: scalar,
                    start_utf16: { type: "integer", minimum: 0 },
                    end_utf16: { type: "integer", minimum: 1 },
                  }),
                  LIMITS.citations,
                ),
                qualification: {
                  type: "string",
                  enum: [
                    "recorded_action",
                    "reported_observation",
                    "unresolved",
                  ],
                },
              }
            : {}),
        }),
        requireStepBindings && stepFacts,
      ),
      64,
    ),
  });
}

export function validateApplicationEvidenceProjection(input) {
  // A derived saved-run view has its own identity. This checks transport
  // integrity, not caller authenticity, and never classifies arbitrary records.
  if (input.provenance?.source === "application-evidence-preparation") {
    const projection = input.provenance.projection;
    assert(projection?.schema === "kaijan.application-assessment-input/1");
    assert.equal(projection.encoding, "json-sorted-keys/1");
    assert(/^[a-f0-9]{64}$/.test(projection.originalInputSha256));
    const derived = clone(input);
    delete derived.provenance.projection;
    assert.equal(
      hash(JSON.stringify(canonical(derived))),
      projection.projectedInputSha256,
      "Application evidence projection changed",
    );
  }
}

function hasRunnerRecap(input) {
  return (
    input?.provenance?.source === "application-evidence-preparation" &&
    Array.isArray(input.evidence) &&
    input.evidence.some(
      ({ text, provenance }) =>
        typeof text === "string" &&
        text.startsWith('{"schema":"loki.runner.execution-recap/1",') &&
        provenance?.source === "application-evidence-projection" &&
        provenance.kind === "application-artifact" &&
        provenance.textSha256 === hash(text),
    )
  );
}

export function prepareSuppliedEvidence(input, options = {}) {
  const prepared = prepareEvidence(
    input,
    options,
    4,
    CURRENT_ASSESSMENT_FORMAT,
  );
  if (options.retainedRequestSha256 !== undefined)
    assert.equal(
      prepared.request_sha256,
      options.retainedRequestSha256,
      "Original saved request required; digest-only prompt reconstruction is unavailable",
    );
  return prepared;
}

function retainedRepresentation(prepared) {
  const citationVersion = prepared.citation_schema_version ?? 1;
  const recordVersion = prepared.assessment_instructions_version ?? 1;
  assert(
    [1, 2, 3, 4].includes(citationVersion),
    "Unknown citation schema version",
  );
  assert(
    Number.isInteger(recordVersion) &&
      recordVersion >= 1 &&
      recordVersion <= CURRENT_ASSESSMENT_FORMAT,
    "Unknown assessment record representation",
  );
  return { citationVersion, recordVersion };
}

// Identity must come from the caller's independently retained record reference,
// not from recomputing a digest after changing the supplied prepared packet.
function verifyRetainedPrepared(prepared, identity) {
  assert(object(identity), "Original assessment identity required");
  for (const key of ["inputSha256", "requestSha256"])
    assert(
      /^[a-f0-9]{64}$/.test(identity[key] ?? ""),
      "Original assessment identity required",
    );
  assert.equal(
    prepared.input_sha256,
    identity.inputSha256,
    "Original input identity changed",
  );
  assert.equal(
    hash(JSON.stringify(prepared.input)),
    identity.inputSha256,
    "Original input changed",
  );
  assert.equal(
    prepared.request_sha256,
    identity.requestSha256,
    "Original request identity changed",
  );
  assert.equal(
    hash(utf8(encodedJson(prepared.request))),
    identity.requestSha256,
    "Original request changed",
  );
  assert.equal(
    typeof prepared.request.instructions,
    "string",
    "Original request instructions required",
  );
  const { citationVersion, recordVersion } = retainedRepresentation(prepared);
  const verified = prepareEvidence(
    prepared.input,
    {
      modelSettings: {
        model: prepared.request.model,
        reasoning: prepared.request.reasoning.effort,
      },
    },
    citationVersion,
    recordVersion,
    false,
    prepared.request.instructions,
  );
  // Rebuild source/schema membership independently. The retained text is data;
  // it cannot change the reconstructed request's inputs or output contract.
  assert.equal(
    verified.input_sha256,
    identity.inputSha256,
    "Original input changed",
  );
  assert.equal(
    verified.request_sha256,
    identity.requestSha256,
    "Original request/source binding changed",
  );
  return verified;
}

/** Rebuild literal sources for a retained-input read without constructing a new
 * inference request. New prompt limits must not make old evidence unreadable. */
export function captureSuppliedAssessmentSources(input) {
  return prepareEvidence(input, {}, 2, 5, true);
}

function prepareEvidence(
  input,
  options,
  citationSchemaVersion,
  recordVersion = CURRENT_ASSESSMENT_FORMAT,
  sourcesOnly = false,
  recordedInstructions,
) {
  const settings = modelSettings(options.modelSettings);
  assert(
    options.requestRepresentation === undefined,
    "Request representation belongs to the experimental adapter",
  );
  validateSuppliedEvidence(input);
  validateApplicationEvidenceProjection(input);
  const original = clone(input),
    sources = [],
    addresses = [],
    evidenceStatus = [],
    images = [];
  const add = (role, originalId, pointer, text, provenance) => {
    assert.equal(
      Buffer.from(text).toString("utf8"),
      text,
      "Original text must be lossless UTF-8",
    );
    const sha256 = hash(text),
      id = "s_" + hash(JSON.stringify([pointer, sha256])).slice(0, 48);
    assert(
      !sources.some((source) => source.id === id),
      "Source identity collision",
    );
    const source = {
      id,
      kind: [
        "outcome",
        "evidence_text",
        "evidence_bytes",
        "evidence_image",
      ].includes(role)
        ? "execution_record"
        : "authored_context",
      format: "full_text",
      text,
      provenance: {
        path: "input.json#" + pointer,
        revision: "sha256:" + sha256,
        revision_kind: "submitted_text_content_hash_not_code_revision",
        reported: clone(provenance),
        role,
        original_id: originalId,
      },
    };
    sources.push(source);
    addresses.push({
      source_id: id,
      role,
      original_id: originalId,
      input_pointer: pointer,
      text_sha256: sha256,
    });
    return id;
  };
  const workSources = [
    add(
      "work_item",
      "work_item",
      "/work_item/title",
      original.work_item.title,
      original.work_item.provenance,
    ),
    add(
      "work_item",
      "work_item",
      "/work_item/body",
      original.work_item.body,
      original.work_item.provenance,
    ),
  ];
  const requirements = original.requirements?.length
    ? original.requirements.map((record, i) => ({
        id: record.id,
        source_ids: [
          add(
            "requirement",
            record.id,
            "/requirements/" + i + "/text",
            record.text,
            record.provenance,
          ),
        ],
      }))
    : [{ id: "work_item", source_ids: workSources }];
  const tests = (original.proposed_tests ?? []).map((record, i) => ({
    id: record.id,
    source_id: add(
      "proposed_test",
      record.id,
      "/proposed_tests/" + i + "/text",
      record.text,
      record.provenance,
    ),
  }));
  const outcomes = original.outcomes.map((record, i) => ({
    id: record.id,
    test_id: record.test_id,
    status: record.status,
    source_id: add(
      "outcome",
      record.id,
      "/outcomes/" + i,
      encodedJson(record, { indent: 2 }),
      record.provenance,
    ),
  }));
  original.evidence.forEach((record, i) => {
    const facets = [],
      base = "/evidence/" + i;
    if (record.text !== null)
      facets.push(
        add(
          "evidence_text",
          record.id,
          base + "/text",
          record.text,
          record.provenance,
        ),
      );
    let bytes = null,
      decoding = null;
    if (record.bytes_base64 !== null) {
      bytes = Buffer.from(record.bytes_base64, "base64");
      if (record.media_type === "image/png") {
        assert(
          images.length < LIMITS.images,
          `At most ${LIMITS.images} selected assessment images`,
        );
        const descriptor = {
          evidence_id: record.id,
          media_type: "image/png",
          sha256: hash(bytes),
          ...pngSize(bytes),
          ...(nonempty(record.provenance?.retained_artifact?.name)
            ? { retained_artifact: clone(record.provenance.retained_artifact) }
            : {}),
        };
        const sourceId = add(
          "evidence_image",
          record.id,
          base + "/bytes_base64",
          encodedJson(descriptor),
          record.provenance,
        );
        facets.push(sourceId);
        images.push({
          sourceId,
          evidenceId: record.id,
          data: record.bytes_base64,
          name: descriptor.retained_artifact?.name,
          captureContext: object(record.provenance?.retained_capture)
            ? clone(record.provenance.retained_capture)
            : null,
        });
        decoding = "supplied_png_image";
      } else
        try {
          const text = new TextDecoder("utf-8", {
            fatal: true,
            ignoreBOM: true,
          }).decode(bytes);
          decoding = "supplied_utf8_bytes";
          facets.push(
            add(
              "evidence_bytes",
              record.id,
              base + "/bytes_base64",
              text,
              record.provenance,
            ),
          );
        } catch {
          decoding = "supplied_opaque_bytes_uninterpreted";
        }
    }
    const status = {
      id: record.id,
      text_supplied: record.text !== null,
      bytes_supplied: bytes !== null,
      bytes_sha256: bytes ? hash(bytes) : null,
      decoding,
      reference: clone(record.reference),
      reference_resolution: record.reference
        ? "unresolved_no_automatic_reads"
        : "not_supplied",
      source_ids: facets,
    };
    status.metadata_source_id = add(
      "evidence_metadata",
      record.id,
      base,
      encodedJson(status, { indent: 2 }),
      record.provenance,
    );
    evidenceStatus.push(status);
  });
  // Source views already carry original text, outcome records and provenance.
  // Keep caller extensions that are not represented by those source facets.
  const additionalMetadata = [];
  const retainMetadata = (pointer, record, represented) => {
    const fields = Object.fromEntries(
      Object.entries(record).filter(([key]) => !represented.includes(key)),
    );
    if (Object.keys(fields).length)
      additionalMetadata.push({ input_pointer: pointer, fields });
  };
  retainMetadata("/work_item", original.work_item, [
    "title",
    "body",
    "provenance",
  ]);
  for (const category of ["requirements", "proposed_tests"])
    (original[category] ?? []).forEach((record, i) =>
      retainMetadata(`/${category}/${i}`, record, ["id", "text", "provenance"]),
    );
  original.evidence.forEach((record, i) =>
    retainMetadata(`/evidence/${i}`, record, [
      "id",
      "text",
      "bytes_base64",
      "reference",
      "provenance",
    ]),
  );
  const submission = {
    origin: "host_derived_submission_membership_only",
    proposed_tests:
      original.proposed_tests === null
        ? null
        : tests.map((record) => record.id),
    outcome_ids: outcomes.map((record) => record.id),
    evidence_status: evidenceStatus,
    requested_target: original.target,
    reported_provenance: original.provenance,
    ...(additionalMetadata.length
      ? { additional_record_metadata: additionalMetadata }
      : {}),
  };
  add(
    "submission_inventory",
    "submission",
    "",
    encodedJson(submission, { indent: 2 }),
    null,
  );
  const capture = captureWorkItemSources({
    contractVersion: SOURCE_BOUND_REVIEW,
    model: settings.model,
    workItem: clone(original.work_item),
    sources,
    selectedSourceIds: sources.map((source) => source.id),
    capture: {
      source: "supplied_test_evidence",
      input_sha256: hash(JSON.stringify(original)),
      artifact_references_resolved: false,
      execution_authenticated: false,
    },
  });
  if (sourcesOnly)
    return {
      input: original,
      input_sha256: hash(JSON.stringify(original)),
      capture,
      addresses,
      evidence_status: evidenceStatus,
    };
  const reportedProvenance = [],
    provenanceIndexes = new Map();
  const views = capture.state.suppliedSources.map((source) => {
    const { reported, ...provenance } = source.provenance,
      key = JSON.stringify(reported);
    let reportedRef = provenanceIndexes.get(key);
    if (reportedRef === undefined) {
      reportedRef = reportedProvenance.length;
      provenanceIndexes.set(key, reportedRef);
      reportedProvenance.push(clone(reported));
    }
    return {
      source_id: source.id,
      source_sha256: source.sha256,
      provenance: { ...provenance, reported_ref: reportedRef },
      text: source.text,
      full_source_citation: source.lines.length
        ? {
            source_id: source.id,
            from_line: 1,
            through_line: source.lines.length,
          }
        : null,
      // Index + 1 is the source line number. Keep the exact UTF-16 offsets while
      // avoiding repeated keys in thousands of model-facing address records.
      lines: source.lines.map((line) => [line.startUtf16, line.endUtf16]),
    };
  });
  const testIds = [
    ...new Set([
      ...tests.map((record) => record.id),
      ...outcomes.map((record) => record.test_id).filter((id) => id !== null),
    ]),
  ];
  const citation =
    citationSchemaVersion >= 2
      ? boundedCitationSchema(views)
      : legacyCitationSchema(views.map((view) => view.source_id));
  const declaredBindings = original.provenance?.testOutcomeBindings ?? [];
  const imageCaption = (image) => {
    return (
      `Evidence ${image.evidenceId}; source ${image.sourceId}.` +
      (image.name ? ` Retained filename: ${encodedJson(image.name)}.` : "") +
      (image.captureContext
        ? ` Supplied capture record: ${encodedJson({
            ...image.captureContext,
            source_ids:
              evidenceStatus.find(
                (evidence) => evidence.id === image.captureContext.evidence_id,
              )?.source_ids ?? [],
          })}.`
        : "") +
      ` Supplied links (not an inferred sequence): ${encodedJson({
        direct_outcome_ids: original.outcomes
          .filter((outcome) => outcome.evidence_ids.includes(image.evidenceId))
          .map((outcome) => outcome.id),
        test_outcome_binding_indexes: declaredBindings.flatMap(
          (binding, index) =>
            binding.evidenceIds.includes(image.evidenceId) ? [index] : [],
        ),
      })}`
    );
  };
  // Only explicit timestamps with a time zone can order attachments. Keep
  // original input order for ties and for images without such a timestamp.
  const captureTime = (image) => {
    const value = image.captureContext?.capturedAt;
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      )
    )
      return null;
    const time = Date.parse(value);
    return Number.isFinite(time) &&
      new Date(value.slice(0, 10)).toISOString().slice(0, 10) ===
        value.slice(0, 10)
      ? time
      : null;
  };
  const orderedImages = images
    .map((image, index) => ({ image, index, time: captureTime(image) }))
    .sort((a, b) => {
      if (a.time === null) return b.time === null ? a.index - b.index : 1;
      if (b.time === null) return -1;
      return a.time - b.time || a.index - b.index;
    })
    .map(({ image }) => image);
  const resultGroups = testResultGroups(original);
  const declaredLinkCitation = views.find(
    (view) => view.provenance.role === "submission_inventory",
  )?.full_source_citation;
  const fixedDeclaredLink = declaredLinkCitation
    ? obj(
        Object.fromEntries(
          Object.entries(declaredLinkCitation).map(([name, value]) => [
            name,
            {
              type: typeof value === "string" ? "string" : "integer",
              enum: [value],
            },
          ]),
        ),
      )
    : null;
  const expectedResults = resultGroups.map((group, index) => ({
    key: `result_${index + 1}`,
    test_id: group.test_id,
    outcome_ids: group.outcomes.map((outcome) => outcome.id),
  }));
  const actionCatalog = recordVersion >= 5 ? sourceActions({ capture }) : [];
  const stepFacts = recordVersion >= 5 && actionCatalog.length > 0;
  const schema = obj({
    test_results: obj(
      Object.fromEntries(
        expectedResults.map((result, index) => {
          const row = testResultSchema(
            citation,
            testIds,
            result.outcome_ids,
            stepFacts,
            recordVersion >= 6 && resultGroups[index].declared
              ? fixedDeclaredLink
              : null,
            recordVersion >= 8,
          );
          if (citationSchemaVersion >= 3 && stepFacts && recordVersion >= 8)
            row.properties.observed_steps.items =
              constrainStepObservationSources(
                row.properties.observed_steps.items,
                stepObservationSourceIds(
                  capture.state.suppliedSources,
                  resultGroups[index].evidenceIds,
                ),
              );
          if (citationSchemaVersion >= 4 && stepFacts && recordVersion >= 8)
            row.properties.observed_steps.items = constrainStepActionSources(
              row.properties.observed_steps.items,
              actionCatalog.filter((action) =>
                resultGroups[index].evidenceIds.has(action.evidence_id),
              ),
            );
          row.properties.test_id =
            result.test_id === null
              ? { type: "null" }
              : { type: "string", enum: [result.test_id] };
          row.properties.outcome_ids.minItems = result.outcome_ids.length;
          return [result.key, row];
        }),
      ),
    ),
    findings: arr(
      obj({
        ...(recordVersion >= 13
          ? findingRecordLinkSchemas({ capture, requirements, tests, outcomes })
          : {
              requirement_ids: idsSchema(
                requirements.map((record) => record.id),
              ),
              test_ids: idsSchema(testIds),
              outcome_ids: idsSchema(outcomes.map((record) => record.id)),
            }),
        kind: {
          type: "string",
          enum: [
            "observation_support",
            "partial_observation_support",
            "contradictory_observation",
            "reported_only",
            "not_exercised",
            "blocked_or_not_run",
            "unresolved_evidence",
            "scope_mismatch",
            "unclear_contract",
          ],
        },
        claim: scalar,
        citations: arr(citation, LIMITS.citations),
        remaining_gap: scalar,
      }),
      LIMITS.findings,
    ),
    summary: scalar,
    limitations: arr(scalar, 32),
  });
  const request = {
    model: settings.model,
    reasoning: { effort: settings.reasoning },
    store: false,
    max_output_tokens: LIMITS.outputTokens,
    instructions:
      recordedInstructions ??
      renderAssessmentInstructions({
        declaredLinks: declaredBindings.length > 0,
        recap: hasRunnerRecap(original),
        images: images.length > 0,
      }),
    input: encodedJson({
      evidence_mode: SUPPLIED_TEST_EVIDENCE,
      requirements,
      proposed_tests: original.proposed_tests === null ? null : tests,
      returned_outcomes: outcomes,
      ...(stepFacts ? { supplied_action_catalog: actionCatalog } : {}),
      expected_test_results: expectedResults,
      test_outcome_bindings: declaredBindings.map((binding) => ({
        ...clone(binding),
        required_citation: clone(
          views.find((view) => view.provenance.role === "submission_inventory")
            .full_source_citation,
        ),
      })),
      evidence_status: evidenceStatus,
      reported_provenance: reportedProvenance,
      source_views: views,
    }),
    text: {
      format: {
        type: "json_schema",
        name:
          citationSchemaVersion >= 3
            ? "supplied_test_assessment_citations_3"
            : "supplied_test_assessment",
        strict: true,
        schema: recordVersion >= 12 ? compactRequestSchema(schema) : schema,
      },
    },
  };
  if (images.length)
    request.input = [
      {
        role: "user",
        content: [
          { type: "input_text", text: request.input },
          ...orderedImages.flatMap((image) => [
            {
              type: "input_text",
              text: imageCaption(image),
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${image.data}`,
              detail: "high",
            },
          ]),
        ],
      },
    ];
  const wire = utf8(encodedJson(request));
  if (wire.length > LIMITS.requestBytes) {
    const error = new Error(
      "Complete assessment request exceeds its byte limit; no evidence was removed.",
    );
    error.code = "assessment_request_limit_exceeded";
    error.actualBytes = wire.length;
    error.maximumBytes = LIMITS.requestBytes;
    throw error;
  }
  return {
    schema: SUPPLIED_TEST_EVIDENCE,
    ...(recordVersion >= 2
      ? { assessment_instructions_version: recordVersion }
      : {}),
    ...(citationSchemaVersion >= 2
      ? { citation_schema_version: citationSchemaVersion }
      : {}),
    input: original,
    input_sha256: hash(JSON.stringify(original)),
    capture,
    addresses,
    requirements,
    tests,
    outcomes,
    test_outcome_bindings: clone(declaredBindings),
    evidence_status: evidenceStatus,
    // Rebuilt from the original input for local validation, never sent to the
    // model. Retained formats keep their original inline request bytes.
    ...(recordVersion >= 12 ? { validation_schema: schema } : {}),
    request,
    request_sha256: hash(wire),
    request_bytes: wire.length,
  };
}

// Literal binding validates addresses only. Luna owns the semantic assessment.
const bindCitations = (verified, sourceById, citations) =>
  citations.map((citation) => {
    const source = sourceById.get(citation.source_id),
      first = source?.lines[citation.from_line - 1],
      last = source?.lines[citation.through_line - 1];
    if (!first || !last || citation.from_line > citation.through_line)
      return {
        status: "invalid",
        reason: "unoffered_line_range",
        original_citation: clone(citation),
        semanticSupport: null,
      };
    return {
      ...bindCapturedSourcePointer(verified.capture, {
        sourceId: citation.source_id,
        sourceSha256: source.sha256,
        startUtf16: first.startUtf16,
        endUtf16: last.endUtf16,
      }),
      original_citation: clone(citation),
    };
  });
const citedSources = (bindings) =>
  new Set(
    bindings
      .filter((binding) => binding.status === "bound")
      .map((binding) => binding.pointer.sourceId),
  );
const validBindings = (bindings) =>
  bindings.length > 0 &&
  bindings.every((binding) => binding.status === "bound");

function projectTestResults(verified, candidate, sourceById) {
  return testResultGroups(verified.input).map((group) => {
    const matches = candidate.test_results.filter((result) =>
      group.test_id === null
        ? result.test_id === null &&
          result.outcome_ids.includes(group.outcomes[0].id)
        : result.test_id === group.test_id,
    );
    const original = matches.length === 1 ? matches[0] : null;
    const errors = [];
    if (!original)
      errors.push(
        matches.length
          ? "duplicate_test_assessment"
          : "missing_test_assessment",
      );
    // This is an explicit model-returned citation, never a host-filled fallback.
    // Retained array candidates can still cite the declaration in citations.
    const citations = original
      ? [
          ...original.citations,
          ...(verified.assessment_instructions_version >= 6 &&
          original.declared_link_citation
            ? [original.declared_link_citation]
            : []),
        ]
      : [];
    const bindings = original
      ? bindCitations(verified, sourceById, citations)
      : [];
    let invalidCitation = bindings.some(
      (binding) => binding.status === "invalid",
    );
    const cited = citedSources(bindings);
    // For external outcomes with no test ID, the model can bind its assessment
    // to explicit requirement text. Copy the cited original text; do not invent
    // a proposal or relax the old saved-result projection.
    const requirementTexts =
      verified.assessment_instructions_version >= 2 &&
      group.test_id === null &&
      !group.test
        ? verified.addresses
            .filter(
              (address) =>
                cited.has(address.source_id) &&
                (address.role === "requirement" ||
                  (!verified.input.requirements?.length &&
                    address.input_pointer === "/work_item/body")),
            )
            .map((address) => sourceById.get(address.source_id)?.text)
            .filter(nonempty)
        : [];
    const expected =
      group.test?.text ??
      (requirementTexts.length ? requirementTexts.join("\n\n") : null);
    const outcomeIds = group.outcomes.map((outcome) => outcome.id);
    const linkedEvidenceIds = group.evidenceIds;
    const contentSources = verified.evidence_status
      .filter((evidence) => linkedEvidenceIds.has(evidence.id))
      .flatMap((evidence) =>
        evidence.source_ids.map((id) => [id, evidence.id]),
      );
    const citedEvidence = (sources) => [
      ...new Set(
        contentSources.filter(([id]) => sources.has(id)).map(([, id]) => id),
      ),
    ];
    const evidenceIds = citedEvidence(cited);
    const foreignExecutionSource = (sourceId) => {
      const address = verified.addresses.find(
        (address) => address.source_id === sourceId,
      );
      return address?.role === "outcome"
        ? !outcomeIds.includes(address.original_id)
        : [
            "evidence_text",
            "evidence_bytes",
            "evidence_image",
            "evidence_metadata",
          ].includes(address?.role) &&
            !linkedEvidenceIds.has(address.original_id);
    };
    if (original) {
      const declaredCitation = original.declared_link_citation;
      const inventoryAddress = verified.addresses.find(
        (address) => address.role === "submission_inventory",
      );
      if (
        declaredCitation &&
        (!group.declared ||
          declaredCitation.source_id !== inventoryAddress?.source_id ||
          declaredCitation.from_line !== 1 ||
          declaredCitation.through_line !==
            sourceById.get(inventoryAddress?.source_id)?.lines.length)
      )
        errors.push("declared_link_citation_mismatch");
      if (
        original.outcome_ids.length !== outcomeIds.length ||
        new Set(original.outcome_ids).size !== outcomeIds.length ||
        !outcomeIds.every((id) => original.outcome_ids.includes(id))
      )
        errors.push("test_outcome_membership_mismatch");
      if (!validBindings(bindings))
        errors.push("missing_or_invalid_literal_citation");
      if ([...cited].some(foreignExecutionSource))
        errors.push("cited_execution_evidence_outside_test");
      if (
        group.declared &&
        !verified.addresses.some(
          (address) =>
            address.role === "submission_inventory" &&
            cited.has(address.source_id) &&
            (verified.assessment_instructions_version < 6 ||
              citations.some(
                (citation) =>
                  citation.source_id === address.source_id &&
                  citation.from_line === 1 &&
                  citation.through_line ===
                    sourceById.get(address.source_id)?.lines.length,
              )),
        )
      )
        errors.push("declared_test_outcome_binding_not_literally_cited");
      const proposal = verified.tests.find((test) => test.id === group.test_id);
      if (proposal && !cited.has(proposal.source_id))
        errors.push("test_expectation_not_literally_cited");
      for (const outcome of verified.outcomes.filter((outcome) =>
        outcomeIds.includes(outcome.id),
      ))
        if (!cited.has(outcome.source_id))
          errors.push("named_outcome_not_literally_cited:" + outcome.id);
      if (!nonempty(original.reason)) errors.push("assessment_reason_required");
      if (original.verdict !== "inconclusive") {
        if (!nonempty(expected))
          errors.push("missing_original_test_expectation");
        if (!outcomeIds.length) errors.push("missing_test_outcome");
        if (original.basis !== "observed_evidence" || !evidenceIds.length)
          errors.push("missing_linked_observation_evidence");
        if (!nonempty(original.actual)) errors.push("observed_actual_required");
      }
    }
    const observedSteps = [];
    for (const step of original?.observed_steps ?? []) {
      const stepBindings = bindCitations(verified, sourceById, step.citations);
      invalidCitation ||= stepBindings.some(
        (binding) => binding.status === "invalid",
      );
      if (
        original.basis !== "observed_evidence" ||
        !nonempty(step.description) ||
        !validBindings(stepBindings) ||
        [...citedSources(stepBindings)].some(foreignExecutionSource) ||
        !citedEvidence(citedSources(stepBindings)).length
      ) {
        errors.push("step_without_linked_observation_evidence");
        continue;
      }
      const facts =
        verified.assessment_instructions_version >= 5 &&
        sourceActions(verified).length > 0
          ? bindAssessmentStepFacts(verified, group.test_id, outcomeIds, step)
          : undefined;
      if (facts?.errors.length) {
        errors.push(...facts.errors);
        continue;
      }
      observedSteps.push({
        ...clone(step),
        literal_bindings: stepBindings,
        ...(facts ? { step_facts: facts } : {}),
      });
    }
    return {
      test_id: group.test_id,
      outcome_ids: outcomeIds,
      original_test: clone(group.test),
      declared_binding: clone(group.declared),
      // Copy original proposed-test or model-cited requirement text without paraphrase.
      expected,
      verdict: errors.length ? "inconclusive" : original.verdict,
      basis: original?.basis ?? "missing_evidence",
      actual:
        errors.length ||
        original?.basis !== "observed_evidence" ||
        !evidenceIds.length ||
        !nonempty(original?.actual)
          ? null
          : original.actual,
      reason: errors.length
        ? invalidCitation
          ? "The checker returned an invalid evidence citation. Its test assessment was rejected."
          : "The supplied records do not support a bound test assessment."
        : original.reason,
      evidence_ids: evidenceIds,
      citations: clone(citations),
      literal_bindings: bindings,
      observed_steps: errors.length ? [] : observedSteps,
      original_result: clone(original),
      validation_errors: errors,
      status: errors.length ? "needs_review" : "bound_model_assessment",
    };
  });
}

export function projectSuppliedAssessment(prepared, candidate, options = {}) {
  const {
    citationVersion: citationSchemaVersion,
    recordVersion: recordVersion,
  } = retainedRepresentation(prepared);
  let verified;
  if (options.retainedIdentity !== undefined) {
    verified = verifyRetainedPrepared(prepared, options.retainedIdentity);
  } else {
    assert.equal(
      recordVersion,
      CURRENT_ASSESSMENT_FORMAT,
      "Original assessment identity required for a retained request",
    );
    assert.equal(
      citationSchemaVersion,
      4,
      "Original assessment identity required for a retained request",
    );
    verified = prepareSuppliedEvidence(prepared.input, {
      modelSettings: {
        model: prepared.request.model,
        reasoning: prepared.request.reasoning.effort,
      },
    });
    assert.equal(
      verified.input_sha256,
      prepared.input_sha256,
      "Prepared input changed; no rebinding",
    );
    assert.equal(
      verified.request_sha256,
      prepared.request_sha256,
      "Prepared input/request changed; no rebinding",
    );
  }
  // Old saved candidates have no test_results. Do not invent verdicts for them.
  const schema = clone(
    verified.validation_schema ?? verified.request.text.format.schema,
  );
  // Producer bounds prevent unoffered lines. The strict literal binder still
  // rejects bad model output and retains its original citations for review.
  const citation = legacyCitationSchema(
    verified.capture.state.suppliedSources.map((source) => source.id),
  );
  const legacyProgrammaticFindings =
    recordVersion >= 13 &&
    (Array.isArray(candidate?.test_results) ||
      !Object.hasOwn(candidate ?? {}, "test_results")) &&
    Array.isArray(candidate?.findings) &&
    candidate.findings.every(
      (finding) =>
        object(finding) && !Object.hasOwn(finding, "requirement_refs"),
    );
  const pairedFindings = recordVersion >= 13 && !legacyProgrammaticFindings;
  if (legacyProgrammaticFindings) {
    // Existing programmatic readers use the old array/no-result form. This
    // does not change the keyed response schema offered to new model calls.
    const rest = { ...schema.properties.findings.items.properties };
    delete rest.requirement_refs;
    delete rest.test_refs;
    delete rest.outcome_refs;
    schema.properties.findings.items = obj({
      requirement_ids: idsSchema(
        verified.requirements.map((record) => record.id),
      ),
      test_ids: idsSchema([
        ...new Set([
          ...verified.tests.map((record) => record.id),
          ...verified.outcomes.map((record) => record.test_id).filter(nonempty),
        ]),
      ]),
      outcome_ids: idsSchema(verified.outcomes.map((record) => record.id)),
      ...rest,
    });
  }
  schema.properties.findings.items.properties.citations.items = citation;
  if (pairedFindings) {
    for (const name of ["requirement_refs", "test_refs", "outcome_refs"]) {
      for (const variant of schema.properties.findings.items.properties[name]
        .items.anyOf ?? []) {
        // Preserve invalid returned pointers for the per-finding rejection
        // below; never silently replace them with offered citations.
        variant.properties.citations.items = citation;
        delete variant.properties.citations.minItems;
      }
    }
  }
  for (const row of Object.values(schema.properties.test_results.properties)) {
    row.properties.citations.items = citation;
    // Keep incomplete saved candidates readable. Membership is checked below
    // and cannot produce a verdict from a missing required outcome.
    delete row.properties.outcome_ids.minItems;
    if (row.properties.observed_steps.items.anyOf)
      row.properties.observed_steps.items = testResultSchema(
        citation,
        [],
        [],
        true,
      ).properties.observed_steps.items;
    else
      row.properties.observed_steps.items.properties.citations.items = citation;
    if (row.properties.declared_link_citation)
      row.properties.declared_link_citation = citation;
  }
  if (Array.isArray(candidate?.test_results)) {
    const testIds = [
      ...new Set([
        ...verified.tests.map((test) => test.id),
        ...verified.outcomes.map((outcome) => outcome.test_id).filter(nonempty),
      ]),
    ];
    const row = testResultSchema(
      citation,
      testIds,
      verified.outcomes.map((outcome) => outcome.id),
      recordVersion >= 5 && sourceActions(verified).length > 0,
      recordVersion >= 6 ? citation : null,
    );
    // The programmatic array form predates the keyed response format. It must
    // still supply a literal declaration citation; omission is never repaired.
    row.required = row.required.filter(
      (key) => key !== "declared_link_citation",
    );
    schema.properties.test_results = arr(
      row,
      testResultGroups(verified.input).length,
    );
  }
  if (object(candidate) && !Object.hasOwn(candidate, "test_results")) {
    delete schema.properties.test_results;
    schema.required = schema.required.filter((key) => key !== "test_results");
  }
  const errors = reviewSchemaErrors(candidate, schema);
  assert.equal(
    errors.length,
    0,
    "Invalid original assessment schema: " + JSON.stringify(errors),
  );
  const requirements = new Map(
    verified.requirements.map((record) => [record.id, record]),
  );
  const sourceById = new Map(
    verified.capture.state.suppliedSources.map((source) => [source.id, source]),
  );
  const offeredLinks = pairedFindings
    ? findingRecordLinkSchemas(verified)
    : null;
  const rows = candidate.findings.map((returnedFinding, index) => {
    const finding = pairedFindings
      ? flattenFindingRecordLinks(returnedFinding)
      : returnedFinding;
    const failures = [];
    if (pairedFindings)
      for (const [name, offered] of Object.entries(offeredLinks))
        if (reviewSchemaErrors(returnedFinding[name], offered).length)
          failures.push("invalid_finding_record_reference:" + name);
    if (!finding.requirement_ids.length || !finding.claim.trim())
      failures.push("substantive_finding_requires_requirement_and_claim");
    for (const field of ["requirement_ids", "test_ids", "outcome_ids"])
      if (new Set(finding[field]).size !== finding[field].length)
        failures.push("duplicate_" + field);
    const bindings = bindCitations(verified, sourceById, finding.citations);
    const cited = new Set(
      bindings
        .filter((binding) => binding.status === "bound")
        .map((binding) => binding.pointer.sourceId),
    );
    if (
      !bindings.length ||
      bindings.some((binding) => binding.status !== "bound")
    )
      failures.push("missing_or_invalid_literal_citation");
    for (const id of finding.requirement_ids)
      if (
        !requirements
          .get(id)
          ?.source_ids.some((sourceId) => cited.has(sourceId))
      )
        failures.push("requirement_not_literally_cited:" + id);
    for (const id of finding.outcome_ids)
      if (
        !verified.outcomes.some(
          (outcome) => outcome.id === id && cited.has(outcome.source_id),
        )
      )
        failures.push("named_outcome_not_literally_cited:" + id);
    for (const id of finding.test_ids)
      if (
        !verified.tests.some(
          (test) => test.id === id && cited.has(test.source_id),
        ) &&
        !verified.outcomes.some(
          (outcome) => outcome.test_id === id && cited.has(outcome.source_id),
        ) &&
        !(
          verified.addresses.some(
            (address) =>
              address.role === "submission_inventory" &&
              cited.has(address.source_id),
          ) &&
          verified.test_outcome_bindings.some(
            (binding) =>
              binding.testId === id &&
              verified.outcomes.some(
                (outcome) =>
                  binding.outcomeIds.includes(outcome.id) &&
                  finding.outcome_ids.includes(outcome.id) &&
                  cited.has(outcome.source_id),
              ),
          )
        )
      )
        failures.push("named_test_not_literally_cited:" + id);
    return {
      id:
        "finding-" +
        (index + 1) +
        "-" +
        hash(JSON.stringify(candidate)).slice(0, 16),
      original_finding: clone(finding),
      literal_bindings: bindings,
      validation_errors: failures,
      status: failures.length ? "needs_review" : "bound_model_assessment",
      semantic_support: null,
    };
  });
  const unassessed = verified.requirements
    .filter(
      (record) =>
        !rows.some((row) =>
          row.original_finding.requirement_ids.includes(record.id),
        ),
    )
    .map((record) => record.id);
  const testResults = Object.hasOwn(candidate, "test_results")
    ? projectTestResults(
        verified,
        {
          ...candidate,
          test_results: Array.isArray(candidate.test_results)
            ? candidate.test_results
            : Object.values(candidate.test_results),
        },
        sourceById,
      )
    : null;
  const status =
    rows.some((row) => row.validation_errors.length) ||
    unassessed.length ||
    testResults?.some((row) => row.validation_errors.length)
      ? "partial"
      : "complete_record_membership";
  return {
    schema: SUPPLIED_ASSESSMENT,
    original_candidate: clone(candidate),
    ...(testResults !== null ? { test_results: testResults } : {}),
    findings: rows,
    reported_outcomes: clone(verified.input.outcomes),
    optional_proposal_supplied: verified.input.proposed_tests !== null,
    evidence_status: clone(verified.evidence_status),
    coverage: {
      status: status === "partial" ? "partial" : "complete",
      unassessed_requirement_ids: unassessed,
      semantic_completeness: null,
      interpretation:
        "Record membership and exact source binding only; no whole-item acceptance or authenticated execution.",
    },
    validation_status: status,
    execution_authenticated: false,
    acceptance_decision: null,
  };
}

export async function assessSuppliedEvidence(input, options = {}) {
  assert(
    options.requestRepresentation === undefined,
    "Request representation belongs to the experimental adapter",
  );
  return assessPreparedSuppliedEvidence(
    prepareSuppliedEvidence(input, options),
    options,
    projectSuppliedAssessment,
  );
}
