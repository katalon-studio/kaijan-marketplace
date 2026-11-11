// Pure source-span validation and fixed relation rendering. The caller must
// authenticate and classify its captured application catalog first. A matching
// hash proves bytes, not authorship or the semantic support of a proposal.
import { createHash } from "node:crypto";

const textHash = (text) => createHash("sha256").update(text).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const need = (condition) => {
  if (!condition) throw Error("Invalid planning source relation");
};
const exact = (value, keys) =>
  object(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const string = { type: "string" };
const relation = {
  inspect: [1, (a) => `Inspect ${a}.`],
  open: [1, (a) => `Open ${a}.`],
  select: [1, (a) => `Select ${a}.`],
  activate: [1, (a) => `Activate ${a}.`],
  enter: [2, (a, b) => `Enter ${b} in ${a}.`],
  submit: [1, (a) => `Submit ${a}.`],
  reload: [1, (a) => `Reload ${a}.`],
  "leave-and-return": [1, (a) => `Leave ${a}, then return.`],
  compare: [2, (a, b) => `Compare ${a} with ${b}.`],
  "verify-preserved": [1, (a) => `Check that ${a} remains unchanged.`],
  "verify-visible": [1, (a) => `Check that ${a} is visible.`],
  "verify-absent": [1, (a) => `Check that ${a} is absent.`],
  "confirm-requirement": [1, (a) => `Check the supplied requirement: ${a}`],
  "check-under-condition": [2, (a, b) => `Check ${a} when ${b}.`],
};
const gaps = {
  "missing-target":
    "The application target must be supplied before this check can run.",
  "missing-test-data":
    "The required application test data has not been supplied.",
  "missing-expected-result":
    "The expected application result needs confirmation.",
  "source-conflict":
    "The cited application sources need review for conflicting expectations.",
  "unsupported-proposal":
    "This proposed check needs a supported procedure before it can run.",
};
const methods = {
  browser: "Browser interaction",
  api: "API check",
  "source-review": "Source review",
  manual: "Manual check",
  other: "Proposed approach needs confirmation",
};
export function applicationCatalog(catalog) {
  need(Array.isArray(catalog));
  const ids = new Set();
  return catalog.filter((row) => {
    need(object(row) && typeof row.id === "string" && !ids.has(row.id));
    ids.add(row.id);
    return (
      ["intent", "implementation", "context"].includes(row.kind) &&
      typeof row.source_id === "string" &&
      typeof row.quote === "string" &&
      textHash(row.quote) === row.quote_sha256 &&
      !/^(?:saved-risk:|supplement-risk-|kaijan-|runner-|assessment-prepare:)/.test(
        row.source_id,
      ) &&
      !["operation-facts", "terminal-observation-provenance"].includes(
        row.source_id,
      ) &&
      !/^(?:kaijan|loki|runner|assessment)[-+:]/i.test(row.uri ?? "")
    );
  });
}
export function planningTextSchema(catalog) {
  const ids = applicationCatalog(catalog).map((row) => row.id);
  const span = obj({
    evidence_id: { ...string, ...(ids.length ? { enum: ids } : {}) },
    start: { type: "integer", minimum: 0 },
    end: { type: "integer", minimum: 1 },
  });
  return {
    anyOf: [
      obj({ kind: { const: "source", type: "string" }, span }),
      ...Object.entries(relation).map(([name, [arity]]) =>
        obj({
          kind: { const: "relation", type: "string" },
          relation: { const: name, type: "string" },
          operands: {
            type: "array",
            items: span,
            minItems: arity,
            maxItems: arity,
          },
        }),
      ),
      obj({
        kind: { const: "gap", type: "string" },
        code: { type: "string", enum: Object.keys(gaps) },
      }),
      obj({
        kind: { const: "method", type: "string" },
        approach: { type: "string", enum: Object.keys(methods) },
      }),
    ],
  };
}
function spanText(span, catalog) {
  need(exact(span, ["evidence_id", "start", "end"]));
  const source = catalog.find((row) => row.id === span.evidence_id);
  need(
    source &&
      Number.isSafeInteger(span.start) &&
      Number.isSafeInteger(span.end) &&
      span.start >= 0 &&
      span.end > span.start &&
      span.end <= source.quote.length,
  );
  const text = source.quote.slice(span.start, span.end);
  need(text.trim().length > 0 && text.isWellFormed());
  return text;
}
export function resolveApplicationSpan(span, suppliedCatalog) {
  return spanText(span, applicationCatalog(suppliedCatalog));
}
export function renderPlanningText(value, suppliedCatalog) {
  const catalog = applicationCatalog(suppliedCatalog);
  if (value?.kind === "source") {
    need(exact(value, ["kind", "span"]));
    return spanText(value.span, catalog);
  }
  if (value?.kind === "relation") {
    need(
      exact(value, ["kind", "relation", "operands"]) &&
        Object.hasOwn(relation, value.relation),
    );
    const [arity, render] = relation[value.relation];
    need(Array.isArray(value.operands) && value.operands.length === arity);
    return render(...value.operands.map((span) => spanText(span, catalog)));
  }
  if (value?.kind === "gap") {
    need(exact(value, ["kind", "code"]) && Object.hasOwn(gaps, value.code));
    return gaps[value.code];
  }
  need(
    value?.kind === "method" &&
      exact(value, ["kind", "approach"]) &&
      Object.hasOwn(methods, value.approach),
  );
  return methods[value.approach];
}

// New candidates copy literal excerpts. The host resolves offsets; generation
// never counts characters. These helpers do not change retained v1 spans.
export function planningExcerptSchema(catalog) {
  const schema = planningTextSchema(catalog);
  const ids = applicationCatalog(catalog).map((row) => row.id);
  const excerpt = obj({
    evidence_id: { ...string, ...(ids.length ? { enum: ids } : {}) },
    text: { type: "string", minLength: 1 },
  });
  schema.anyOf = schema.anyOf.filter(
    (variant) => variant.properties.kind.const !== "gap",
  );
  schema.anyOf.push(
    obj({ kind: { const: "prerequisite", type: "string" }, span: excerpt }),
  );
  schema.anyOf.push(
    obj({
      kind: { const: "gap", type: "string" },
      code: {
        type: "string",
        enum: ["source-conflict", "unsupported-proposal"],
      },
    }),
  );
  for (const variant of schema.anyOf) {
    if (variant.properties.span) variant.properties.span = excerpt;
    if (variant.properties.operands)
      variant.properties.operands.items = excerpt;
  }
  return schema;
}
export function resolveApplicationExcerpt(excerpt, suppliedCatalog) {
  need(exact(excerpt, ["evidence_id", "text"]));
  const source = applicationCatalog(suppliedCatalog).find(
    (row) => row.id === excerpt.evidence_id,
  );
  need(
    source &&
      typeof excerpt.text === "string" &&
      excerpt.text.length > 0 &&
      excerpt.text.trim() === excerpt.text &&
      excerpt.text.isWellFormed(),
  );
  const start = source.quote.indexOf(excerpt.text);
  need(start >= 0 && source.quote.indexOf(excerpt.text, start + 1) < 0);
  const end = start + excerpt.text.length;
  // Mechanical lexical boundaries, not a claim about meaning or completeness.
  // A longer literal excerpt disambiguates repeated text without a guessed index.
  const segments = new Intl.Segmenter("und", { granularity: "word" }).segment(
    source.quote,
  );
  for (const segment of segments) {
    if (!segment.isWordLike) continue;
    const limit = segment.index + segment.segment.length;
    need(
      !(start > segment.index && start < limit) &&
        !(end > segment.index && end < limit),
    );
  }
  return { evidence_id: excerpt.evidence_id, start, end };
}
export function renderPlanningExcerpt(value, catalog) {
  if (value?.kind === "prerequisite") {
    need(exact(value, ["kind", "span"]));
    const selected = resolveApplicationExcerpt(value.span, catalog);
    return `Required for this check: ${resolveApplicationSpan(selected, catalog)}`;
  }
  if (value?.kind === "gap") {
    need(["source-conflict", "unsupported-proposal"].includes(value.code));
  }
  const span = (excerpt) => resolveApplicationExcerpt(excerpt, catalog);
  if (value?.kind === "source") {
    need(exact(value, ["kind", "span"]));
    return renderPlanningText({ ...value, span: span(value.span) }, catalog);
  }
  if (value?.kind === "relation") {
    need(
      exact(value, ["kind", "relation", "operands"]) &&
        Array.isArray(value.operands),
    );
    return renderPlanningText(
      { ...value, operands: value.operands.map(span) },
      catalog,
    );
  }
  return renderPlanningText(value, catalog);
}
