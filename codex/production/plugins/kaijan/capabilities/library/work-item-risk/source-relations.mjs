import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const RISK_SOURCE_VERSION = "risk-source-relations/1";
const hash = (text) => createHash("sha256").update(text).digest("hex");
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join() === [...keys].sort().join();
const need = (value) => {
  if (!value) throw Error("Invalid risk source relation");
};
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const maxExcerptLength = 160;
const words = new Intl.Segmenter("und", { granularity: "word" });
const predicates = {
  "depends-on": [2, (a, b) => `Does ${a} depend on ${b}?`],
  "preserved-under": [2, (a, b) => `Must ${a} remain unchanged when ${b}?`],
  "conflicts-with": [
    2,
    (a, b) => `Do ${a} and ${b} describe conflicting requirements?`,
  ],
  "reachable-under": [2, (a, b) => `Can ${a} occur when ${b}?`],
  "behavior-of": [1, (a) => `What behavior is required for ${a}?`],
};
const consequences = {
  "may-affect": [
    2,
    (a, b) => `If the assumption about ${a} is wrong, ${b} may be affected.`,
  ],
  "may-prevent": [2, (a, b) => `If ${a} does not hold, ${b} may be prevented.`],
  "may-omit": [2, (a, b) => `If ${a} does not hold, ${b} may be omitted.`],
  "may-differ": [
    2,
    (a, b) =>
      `The behavior of ${a} may differ from ${b}; this consequence needs review.`,
  ],
};
const resolutions = {
  "confirm-intent": [
    1,
    (a) => `Confirm the intended behavior described by ${a}.`,
  ],
  "inspect-source": [1, (a) => `Review the source that defines ${a}.`],
  "observe-condition": [
    2,
    (a, b) =>
      `Obtain authorized application evidence for ${a} when ${b}; no action is authorized by this question.`,
  ],
  compare: [2, (a, b) => `Compare the available evidence for ${a} and ${b}.`],
};
export function riskPresentationSchema(
  catalog,
  { literalExcerpts = false } = {},
) {
  const ids = catalog.map((row) => row.id);
  const span = obj({
    evidence_id: { type: "string", ...(ids.length ? { enum: ids } : {}) },
    ...(literalExcerpts
      ? { text: { type: "string" } }
      : {
          start: { type: "integer", minimum: 0 },
          end: { type: "integer", minimum: 1 },
        }),
  });
  const relation = (table) => ({
    anyOf: Object.entries(table).map(([kind, [arity]]) =>
      obj({
        kind: { type: "string", const: kind },
        operands: {
          type: "array",
          items: span,
          minItems: arity,
          maxItems: arity,
        },
      }),
    ),
  });
  return obj({
    observed: { type: "array", items: span, minItems: 1, maxItems: 8 },
    assumption: relation(predicates),
    consequence: relation(consequences),
    resolution: relation(resolutions),
  });
}
export function riskSpans(value) {
  need(exact(value, ["observed", "assumption", "consequence", "resolution"]));
  need(
    Array.isArray(value.observed) &&
      value.observed.length > 0 &&
      value.observed.length <= 8,
  );
  return [
    ...value.observed,
    ...value.assumption.operands,
    ...value.consequence.operands,
    ...value.resolution.operands,
  ];
}
/** Normalize new model excerpts to the retained offset contract. */
export function normalizeRiskExcerpts(value, catalog) {
  riskSpans(value);
  const literal = (excerpt) => {
    need(exact(excerpt, ["evidence_id", "text"]));
    const source = catalog.find((row) => row.id === excerpt.evidence_id);
    const text = excerpt.text;
    need(
      source &&
        typeof text === "string" &&
        text.length > 0 &&
        text.length <= maxExcerptLength &&
        text === text.trim() &&
        text.isWellFormed(),
    );
    const start = source.quote.indexOf(text);
    need(start >= 0 && source.quote.indexOf(text, start + 1) < 0);
    const end = start + text.length;
    const segments = words.segment(source.quote);
    for (const boundary of [start, end]) {
      const segment = segments.containing(boundary);
      need(!segment?.isWordLike || segment.index === boundary);
    }
    return { evidence_id: excerpt.evidence_id, start, end };
  };
  const relation = (node) => ({
    ...node,
    operands: node.operands.map(literal),
  });
  return {
    observed: value.observed.map(literal),
    assumption: relation(value.assumption),
    consequence: relation(value.consequence),
    resolution: relation(value.resolution),
  };
}

/** Resolver is supplied by the verified shared planning module. It validates
 * exact source slices; it does not authenticate the supplied catalog itself. */
export function renderRiskPresentation(value, catalog, resolveApplicationSpan) {
  need(typeof resolveApplicationSpan === "function");
  const spans = riskSpans(value);
  const literal = (span) =>
    JSON.stringify(resolveApplicationSpan(span, catalog));
  const render = (selected, table) => {
    need(
      exact(selected, ["kind", "operands"]) &&
        Object.hasOwn(table, selected.kind),
    );
    const [arity, fn] = table[selected.kind];
    need(
      Array.isArray(selected.operands) && selected.operands.length === arity,
    );
    return fn(...selected.operands.map(literal));
  };
  const question = render(value.assumption, predicates);
  return {
    observed: `The cited sources state: ${value.observed.map(literal).join("; ")}.`,
    assumption_to_confirm: `Unresolved assumption: ${question}`,
    question,
    why_it_matters: render(value.consequence, consequences),
    evidence_needed: render(value.resolution, resolutions),
    evidence_ids: [...new Set(spans.map((span) => span.evidence_id))],
  };
}
export function riskSourceRecord(presentation, catalog) {
  return {
    schema: RISK_SOURCE_VERSION,
    presentation: structuredClone(presentation),
    catalogSha256: hash(JSON.stringify(catalog)),
  };
}
export function verifyRiskSourceRecord(
  question,
  catalog,
  resolveApplicationSpan,
) {
  const record = question.source_projection;
  need(
    exact(record, ["schema", "presentation", "catalogSha256"]) &&
      record.schema === RISK_SOURCE_VERSION &&
      record.catalogSha256 === hash(JSON.stringify(catalog)),
  );
  const rendered = renderRiskPresentation(
    record.presentation,
    catalog,
    resolveApplicationSpan,
  );
  need(
    question.observed_code_behavior === rendered.observed ||
      question.observed_source_statement === rendered.observed,
  );
  for (const key of [
    "assumption_to_confirm",
    "question",
    "why_it_matters",
    "evidence_needed",
  ])
    need(isDeepStrictEqual(question[key], rendered[key]));
  return rendered;
}
/** Host catalog of supplied application bytes. Never read repository paths or
 * promote model-written source_evidence strings into this catalog. */
export function changeRiskCatalog(packet) {
  const rows = [];
  const add = (source_id, kind, text, uri, revision) => {
    if (typeof text !== "string" || !text.length) return;
    rows.push({
      id: `risk-source-${rows.length + 1}`,
      source_id,
      kind,
      uri: uri ?? null,
      revision: revision ?? null,
      line: 1,
      quote: text,
      quote_sha256: hash(text),
    });
  };
  add(
    "work-item",
    "intent",
    packet.work_item?.content,
    packet.work_item?.source_url,
    null,
  );
  for (const [index, file] of (packet.files ?? []).entries()) {
    const revision = packet.source?.head_sha ?? file.sha256;
    add(
      `file-${index + 1}`,
      "implementation",
      file.patch ?? file.content,
      file.filename,
      revision,
    );
    const metadata = Object.fromEntries(
      [
        "filename",
        "previous_filename",
        "status",
        "additions",
        "deletions",
        "old_mode",
        "new_mode",
      ]
        .filter((key) => Object.hasOwn(file, key))
        .map((key) => [key, file[key]]),
    );
    add(
      `file-${index + 1}-metadata`,
      "implementation",
      JSON.stringify(metadata),
      file.filename,
      revision,
    );
  }
  return rows;
}

export const riskRelationInstruction =
  "Return each question as observed source spans, an unresolved assumption relation, a possible consequence relation and an evidence-resolution relation. Use only the fixed kinds and exact UTF-16 start/end spans from source_catalog or passage_catalog. Do not return free-form question prose, internal operations or display IDs. Relations express questions and possible consequences, never verified defects, approved requirements or execution permission.";
