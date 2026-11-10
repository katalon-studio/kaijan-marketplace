import {
  buildRelatedQueryRequest,
  unanchoredSearchInstructions,
} from "./query-prompt.mjs";
import { Buffer } from "node:buffer";
import { check, hash, RelatedError } from "./records.mjs";
import { MODEL, outputText } from "./rank.mjs";
import { SEARCH_LIMITS, searchQueries } from "./search-intent.mjs";
import { retrievalProfile } from "./retrieval.mjs";

export const AVAILABLE_METHOD = "intent-search/2";
export const AVAILABLE_LIMITS = Object.freeze(
  Object.fromEntries(
    Object.entries(SEARCH_LIMITS).filter(
      ([name]) => !["anchors", "anchor_units"].includes(name),
    ),
  ),
);
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "operator", "terms"],
  properties: {
    status: { type: "string", enum: ["selected", "uncertain"] },
    operator: { type: "string", enum: ["all", "any"] },
    terms: {
      type: "array",
      maxItems: AVAILABLE_LIMITS.terms,
      items: {
        type: "string",
        minLength: 1,
        maxLength: AVAILABLE_LIMITS.term_units,
      },
    },
  },
};

export function availableRequest(seed) {
  return buildRelatedQueryRequest(seed, {
    instructions: unanchoredSearchInstructions,
    schemaName: "available_related_work_query",
    schema,
    maxOutputTokens: SEARCH_LIMITS.max_output_tokens,
  });
}

export function availableProfile(value, seed) {
  check(
    value &&
      Object.keys(value).sort().join(",") === "operator,status,terms" &&
      ["selected", "uncertain"].includes(value.status) &&
      ["all", "any"].includes(value.operator) &&
      Array.isArray(value.terms) &&
      value.terms.length <= AVAILABLE_LIMITS.terms,
    "invalid_query_proposal",
  );
  check(
    value.status === "selected"
      ? value.terms.length > 0
      : value.terms.length === 0,
    "invalid_query_proposal",
  );
  const seen = new Set();
  for (const term of value.terms) {
    check(
      typeof term === "string" &&
        term.trim().length > 0 &&
        term.length <= AVAILABLE_LIMITS.term_units,
      "invalid_query_proposal",
    );
    check(!seen.has(term.toLowerCase()), "duplicate_query_fragment");
    seen.add(term.toLowerCase());
  }
  return {
    method: AVAILABLE_METHOD,
    status: value.status,
    operator: value.operator,
    terms: value.terms.map((text, position) => ({
      text,
      position,
      field: "query_probe",
      weight: 1,
      identifier: false,
    })),
    phrases: [],
    groups: value.terms.length ? [[...value.terms]] : [],
    source_hashes: { title: hash(seed.title), body: hash(seed.body) },
    omitted_terms: null,
    omitted_phrases: null,
    semantic_support: "generated_search_hypotheses_not_source_facts",
    coverage:
      "Original source bound on host; no generated quote, entailment or complete intent guarantee",
  };
}

export function sourceRecord(seed) {
  const source = {
    schema: "pcf-query-source/1",
    repo: seed.repo,
    source_kind: seed.kind ?? null,
    source_number: seed.number ?? null,
    source_uri: seed.url,
    revision: seed.revision ?? seed.updated_at,
    captured_at: seed.captured_at,
    title: seed.title,
    body: seed.body,
    title_sha256: hash(seed.title),
    body_sha256: hash(seed.body),
  };
  return { ...source, original_source_sha256: hash(JSON.stringify(source)) };
}

export function modelIdentity(
  request,
  response,
  receipt,
  expectedHash,
  signal,
) {
  signal.throwIfAborted();
  check(
    request.model === MODEL &&
      request.reasoning?.effort === "medium" &&
      request.store === false,
    "provider_request_policy_mismatch",
  );
  check(
    hash(JSON.stringify(request)) === expectedHash &&
      receipt.request_sha256 === expectedHash,
    "provider_request_integrity",
  );
  check(receipt.http_status === 200, "provider_http_error");
  check(
    receipt.model === MODEL &&
      receipt.returned_model === MODEL &&
      response.model === MODEL,
    "provider_model_mismatch_or_unverified",
  );
  check(
    (response.reasoning?.effort ?? null) === null ||
      response.reasoning.effort === "medium",
    "provider_effort_mismatch",
  );
  check(
    receipt.calls === 1 &&
      receipt.unknown_cost_calls === 0 &&
      receipt.unknown_usage_calls === 0 &&
      Number.isFinite(receipt.known_cost_usd) &&
      receipt.known_cost_usd >= 0 &&
      ["input_tokens", "output_tokens"].every(
        (key) =>
          Number.isSafeInteger(receipt.usage?.[key]) && receipt.usage[key] >= 0,
      ),
    "query_accounting_unknown",
  );
  return {
    requested_model: MODEL,
    returned_model: response.model,
    requested_effort: "medium",
    returned_effort: response.reasoning?.effort ?? null,
    evidence:
      "Exact request binding and provider-declared metadata; not independent served-model/effort proof",
  };
}

const unusable = new Set([
  "query_output_invalid",
  "invalid_model_output",
  "invalid_query_proposal",
  "duplicate_query_fragment",
  "query_expression_capacity",
]);
export function availableRetrieval({
  seed,
  request,
  response,
  receipt,
  expectedHash,
  signal,
  policy,
  repositories,
  store,
  state,
}) {
  check(
    ["none", "deterministic"].includes(policy),
    "invalid_query_fallback_policy",
  );
  state.identity = modelIdentity(
    request,
    response,
    receipt,
    expectedHash,
    signal,
  );
  check(response.status === "completed", "model_incomplete");
  check(
    !(response.output ?? []).some((row) =>
      (row.content ?? []).some((part) => part.type === "refusal"),
    ),
    "query_provider_refusal",
  );
  let profile, issue;
  try {
    const text = outputText(response);
    store.write("query-output.txt", Buffer.from(text));
    let candidate;
    try {
      candidate = JSON.parse(text);
    } catch {
      throw new RelatedError("query_output_invalid");
    }
    store.write("candidate.json", candidate);
    state.model_status = ["selected", "uncertain"].includes(candidate?.status)
      ? candidate.status
      : "unrecognized";
    profile = availableProfile(candidate, seed);
    state.profile = profile;
    state.status = profile.status;
    store.write("profile.json", profile);
    if (profile.status === "selected") searchQueries(profile, repositories);
    else issue = "query_selection_uncertain";
  } catch (error) {
    if (!unusable.has(error.code)) throw error;
    issue = error.code;
    state.status = "unusable";
  }
  signal.throwIfAborted();
  state.routing = {
    requested_method: AVAILABLE_METHOD,
    fallback_policy: policy,
    original_query_outcome: state.status,
    original_model_status: state.model_status ?? null,
    reason: issue ?? "query_selected",
    chosen_method: issue
      ? policy === "deterministic"
        ? "seed-lexical/2"
        : null
      : AVAILABLE_METHOD,
  };
  store.write("routing.json", state.routing);
  if (!issue) return profile;
  if (policy !== "deterministic") throw new RelatedError(issue);
  const independent = retrievalProfile(seed);
  store.write("fallback-profile.json", independent);
  return independent;
}
