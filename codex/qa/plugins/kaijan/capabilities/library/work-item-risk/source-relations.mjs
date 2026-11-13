import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const RISK_SOURCE_VERSION = "risk-source-relations/1";
export const RISK_RELATION_GUIDANCE =
  "Use depends-on only for behavior with a specific prerequisite. When the source explicitly leaves a claim unverified, use evidence-for. Its first operand is the claim to check. Its second operand is the stated evidence gap. Tie the possible consequence and the next check to that same claim.";
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
const words = new Intl.Segmenter("und", { granularity: "word" });
const predicates = {
  "depends-on": [2, (a, b) => `Does ${a} depend on ${b}?`],
  "evidence-for": [
    2,
    (claim, gap) => {
      need(claim !== gap);
      return `What evidence can confirm ${claim}? The source says ${gap}.`;
    },
  ],
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
  { literalExcerpts = false, definitions } = {},
) {
  const evidenceSpan = obj({
    evidence_id: { type: "string" },
    ...(literalExcerpts
      ? { text: { type: "string" } }
      : {
          start: { type: "integer", minimum: 0 },
          end: { type: "integer", minimum: 1 },
        }),
  });
  // The caller can share this span across relations in its root JSON Schema.
  if (definitions) definitions.riskEvidenceSpan = evidenceSpan;
  const span = definitions
    ? { $ref: "#/$defs/riskEvidenceSpan" }
    : evidenceSpan;
  // During the selected dogfooding bypass, output quality does not gate a
  // completed review. The retained catalog still owns source identity.
  const relation = () =>
    obj({
      kind: { type: "string" },
      operands: { type: "array", items: span },
    });
  return obj({
    observed: { type: "array", items: span },
    assumption: relation(),
    consequence: relation(),
    resolution: relation(),
  });
}
export function riskSpans(value) {
  need(exact(value, ["observed", "assumption", "consequence", "resolution"]));
  need(Array.isArray(value.observed));
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
    const raw = excerpt.text;
    need(source && typeof raw === "string" && raw.isWellFormed());
    const text = raw.trim();
    // Keep the padding only as proof of an exact source excerpt. The retained
    // offsets must still select one unambiguous whole-word slice.
    need(text.length > 0 && (text === raw || source.quote.includes(raw)));
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

/** Keep available model wording without inventing a verified source slice.
 * Strict proofs remain useful when available, but their failure is not a
 * reason to discard this row or its valid siblings. */
export function availableRiskPresentation(value, catalog, resolve) {
  try {
    const presentation = normalizeRiskExcerpts(value, catalog);
    return {
      row: renderRiskPresentation(presentation, catalog, resolve),
      source_projection: riskSourceRecord(presentation, catalog),
    };
  } catch {
    // The original response stays in the transport record. This projection is
    // explicitly model-authored wording, never an authenticated quotation.
  }
  const list = (item) =>
    Array.isArray(item)
      ? item
      : item === undefined || item === null
        ? []
        : [item];
  const literal = (span) => {
    if (typeof span === "string") return JSON.stringify(span);
    if (typeof span?.text === "string") return JSON.stringify(span.text);
    const source = catalog.find((row) => row.id === span?.evidence_id);
    if (
      source &&
      Number.isInteger(span.start) &&
      Number.isInteger(span.end) &&
      span.start >= 0 &&
      span.end >= span.start &&
      span.end <= source.quote.length
    )
      return JSON.stringify(source.quote.slice(span.start, span.end));
    return "";
  };
  const render = (node, table) => {
    if (typeof node === "string") return node;
    const values = list(node?.operands).map(literal).filter(Boolean);
    const selected =
      typeof node?.kind === "string" && Object.hasOwn(table, node.kind)
        ? table[node.kind]
        : null;
    if (selected && values.length === selected[0]) {
      try {
        return node.kind === "evidence-for"
          ? `What evidence can confirm ${values[0]}? The review notes ${values[1]}.`
          : selected[1](...values);
      } catch {
        // A semantic predicate can be unusable without losing its wording.
      }
    }
    // Best-effort output can put the question/explanation in an unfamiliar
    // kind string. Keep that wording as attributed model text, not a proof.
    return [typeof node?.kind === "string" ? node.kind : "", ...values]
      .filter(Boolean)
      .join("; ");
  };
  const observed = list(value?.observed);
  const spans = [
    ...observed,
    ...list(value?.assumption?.operands),
    ...list(value?.consequence?.operands),
    ...list(value?.resolution?.operands),
  ];
  const known = new Set(catalog.map((row) => row.id));
  const prose = (field) =>
    typeof value?.[field] === "string" ? value[field] : "";
  const question =
    (typeof value === "string" ? value : prose("question")) ||
    render(value?.assumption, predicates);
  const statements = observed.map(literal).filter(Boolean);
  const originalStatement = [
    prose("observed_source_statement"),
    prose("observed_code_behavior"),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    row: {
      observed:
        originalStatement ||
        (statements.length
          ? `The risk review refers to: ${statements.join("; ")}.`
          : ""),
      assumption_to_confirm:
        prose("assumption_to_confirm") ||
        (question ? `Unresolved assumption: ${question}` : ""),
      question,
      why_it_matters:
        prose("why_it_matters") || render(value?.consequence, consequences),
      evidence_needed:
        prose("evidence_needed") || render(value?.resolution, resolutions),
      evidence_ids: [
        ...new Set(
          [
            ...spans.map((span) => span?.evidence_id),
            ...list(value?.evidence_ids),
            ...list(value?.source_evidence),
          ].filter((id) => known.has(id)),
        ),
      ],
    },
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
  // Keep original source items separate. Serializing their text into one JSON
  // quote creates duplicate passages and artificial escaped-newline boundaries.
  for (const [index, source] of (packet.context_sources ?? []).entries()) {
    add(
      `context-${index + 1}`,
      source.kind,
      source.text,
      source.uri,
      source.revision,
    );
  }
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
