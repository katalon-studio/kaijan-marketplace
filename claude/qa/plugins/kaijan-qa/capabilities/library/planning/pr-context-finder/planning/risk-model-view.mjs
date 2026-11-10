import { createHash } from "node:crypto";
import { copy, equal, object } from "./semantics.mjs";
import { encodedJson, parseJson } from "../related/json.mjs";

const hash = (text) => createHash("sha256").update(text).digest("hex");
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const keysWithin = (value, keys) =>
  object(value) && Object.keys(value).every((key) => keys.includes(key));
const count = (value) => Number.isInteger(value) && value >= 0;

// Projection is optional. Require exact numeric spellings through the local
// codec instead of rounding application decimals/exponents. Quoted text is not
// numeric data. Even an equivalent spelling change conservatively keeps the
// original source representation; this does not change the historical codec.
function numericTokens(text) {
  const tokens = [];
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '"') {
      while (++index < text.length) {
        if (text[index] === "\\") index++;
        else if (text[index] === '"') break;
      }
    } else if (text[index] === "-" || /\d/.test(text[index])) {
      const start = index;
      while (index + 1 < text.length && /[\deE+.-]/.test(text[index + 1]))
        index++;
      tokens.push(text.slice(start, index + 1));
    }
  }
  return tokens;
}

// These are typed native receipt fields, not a keyword filter over app data.
function receiptField(key, value) {
  if (key === "transport_artifacts")
    return (
      Array.isArray(value) &&
      value.every(
        (row) =>
          keysWithin(row, ["path", "bytes", "sha256"]) &&
          Object.keys(row).length === 3 &&
          typeof row.path === "string" &&
          count(row.bytes) &&
          digest(row.sha256),
      )
    );
  if (key === "accounting")
    return (
      keysWithin(value, [
        "calls_started",
        "known_cost_usd",
        "unknown_cost_calls",
        "elapsed_seconds",
        "execution",
      ]) &&
      count(value.calls_started) &&
      count(value.unknown_cost_calls) &&
      Number.isFinite(value.known_cost_usd) &&
      value.known_cost_usd >= 0 &&
      Number.isFinite(value.elapsed_seconds) &&
      value.elapsed_seconds >= 0 &&
      typeof value.execution === "string"
    );
  if (key === "model")
    return (
      keysWithin(value, [
        "requested",
        "requested_effort",
        "served_effort",
        "returned",
      ]) &&
      typeof value.requested === "string" &&
      typeof value.requested_effort === "string" &&
      typeof value.served_effort === "string" &&
      Array.isArray(value.returned) &&
      value.returned.every(
        (entry) => entry === null || typeof entry === "string",
      )
    );
  return false;
}

function riskContext(source) {
  const provenance = source.provenance;
  if (
    source.kind !== "context" ||
    Object.hasOwn(source, "context_from_evidence_id") ||
    Object.hasOwn(source, "text_from_evidence_id") ||
    !object(provenance) ||
    !["changeRisk", "riskFinder"].includes(provenance.family) ||
    !digest(provenance.answerId) ||
    !digest(provenance.resultSha256) ||
    source.revision !== provenance.resultSha256 ||
    source.id !==
      "saved-risk:" + provenance.family + ":" + provenance.answerId ||
    source.uri !==
      "kaijan-answer://" + provenance.family + "/" + provenance.answerId ||
    typeof source.text !== "string" ||
    hash(source.text) !== provenance.resultSha256
  )
    return;
  let value;
  try {
    value = parseJson(source.text, { constants: false, duplicates: "reject" });
    if (!equal(numericTokens(source.text), numericTokens(encodedJson(value))))
      return;
  } catch {
    return;
  }
  if (
    !object(value) ||
    value.schema !== "risk-finder/work-item-result/1" ||
    value.method !== "work-item-luna-uncertainties/1" ||
    value.evidence_type !== "work-item" ||
    typeof value.status !== "string" ||
    !Array.isArray(value.assumptions_to_confirm) ||
    !Array.isArray(value.source_bindings) ||
    typeof value.limitations !== "string"
  )
    return;
  const context = copy(value);
  let changed = false;
  for (const key of ["accounting", "model", "transport_artifacts"])
    if (Object.hasOwn(context, key) && receiptField(key, context[key])) {
      delete context[key];
      changed = true;
    }
  return changed ? context : undefined;
}

/** Derived risk context is not a rewritten literal quote. Complete original
 * sources/evidence remain in prepared; the saved evidence ID still binds them. */
export function planningRiskModelView(prepared, modelInput) {
  if (Object.hasOwn(prepared, "model_input_version")) return modelInput;
  const view = copy(modelInput);
  let changed = false;
  for (const original of prepared.sources) {
    const context = riskContext(original);
    if (!context) continue;
    const sources = view.sources.filter((row) => row.id === original.id);
    const rows = view.evidence_catalog.filter(
      (row) =>
        row.source_id === original.id &&
        row.kind === original.kind &&
        row.uri === original.uri &&
        row.revision === original.revision &&
        row.line === 1 &&
        row.quote === original.text &&
        row.quote_sha256 === original.revision,
    );
    if (
      sources.length !== 1 ||
      rows.length !== 1 ||
      typeof rows[0].id !== "string" ||
      view.evidence_catalog.filter((row) => row.id === rows[0].id).length !==
        1 ||
      ["authority_limit", "attribution", "provenance"].some(
        (key) => !equal(sources[0][key], original[key]),
      )
    )
      continue;
    delete sources[0].text;
    delete sources[0].text_from_evidence_id;
    sources[0].context_from_evidence_id = rows[0].id;
    delete rows[0].quote;
    rows[0].risk_context = context;
    changed = true;
  }
  if (!changed) return modelInput;
  view.model_input_version = "planning-source-text/2";
  return view;
}
