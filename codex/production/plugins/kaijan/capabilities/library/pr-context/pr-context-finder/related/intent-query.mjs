import {
  buildRelatedQueryRequest,
  sourcePhraseInstructions,
} from "./query-prompt.mjs";
import { check, hash } from "./records.mjs";

export const INTENT_METHOD = "source-intent/1";
export const QUERY_LIMITS = Object.freeze({
  calls: 1,
  timeout_ms: 45000,
  max_output_tokens: 1600,
  groups: 2,
  fragments_per_group: 3,
  fragment_units: 80,
});
const fragment = {
  type: "object",
  additionalProperties: false,
  required: ["field", "text"],
  properties: {
    field: { type: "string", enum: ["title", "body"] },
    text: {
      type: "string",
      minLength: 1,
      maxLength: QUERY_LIMITS.fragment_units,
    },
  },
};
export const querySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "groups"],
  properties: {
    status: { type: "string", enum: ["selected", "uncertain"] },
    groups: {
      type: "array",
      maxItems: QUERY_LIMITS.groups,
      items: {
        type: "array",
        minItems: 1,
        maxItems: QUERY_LIMITS.fragments_per_group,
        items: fragment,
      },
    },
  },
};

export function queryRequest(seed) {
  return buildRelatedQueryRequest(seed, {
    instructions: sourcePhraseInstructions,
    schemaName: "related_work_query_selection",
    schema: querySchema,
    maxOutputTokens: QUERY_LIMITS.max_output_tokens,
  });
}

export function intentProfile(value, seed) {
  check(
    value &&
      Object.keys(value).sort().join(",") === "groups,status" &&
      ["selected", "uncertain"].includes(value.status) &&
      Array.isArray(value.groups) &&
      value.groups.length <= QUERY_LIMITS.groups,
    "invalid_query_selection",
  );
  check(
    value.status === "selected"
      ? value.groups.length > 0
      : value.groups.length === 0,
    "invalid_query_selection",
  );
  const terms = [],
    seen = new Set();
  for (const group of value.groups) {
    check(
      Array.isArray(group) &&
        group.length >= 1 &&
        group.length <= QUERY_LIMITS.fragments_per_group,
      "invalid_query_selection",
    );
    for (const row of group) {
      check(
        row &&
          Object.keys(row).sort().join(",") === "field,text" &&
          ["title", "body"].includes(row.field) &&
          typeof row.text === "string" &&
          row.text.trim().length > 0 &&
          row.text.length <= QUERY_LIMITS.fragment_units &&
          seed[row.field].includes(row.text),
        "query_source_binding_mismatch",
      );
      check(!seen.has(row.text.toLowerCase()), "duplicate_query_fragment");
      seen.add(row.text.toLowerCase());
      terms.push({
        ...row,
        weight: 1,
        position: seed[row.field].indexOf(row.text),
        identifier: false,
      });
    }
  }
  return {
    method: INTENT_METHOD,
    status: value.status,
    terms,
    phrases: [],
    groups: value.groups.map((group) => group.map((row) => row.text)),
    omitted_terms: null,
    omitted_phrases: null,
    source_hashes: { title: hash(seed.title), body: hash(seed.body) },
    semantic_support: "model_assertion_requires_review",
    coverage:
      "bounded selected literals; complete intent coverage not established",
  };
}

export function combinedAccounting(...receipts) {
  const unknownUsage = receipts.reduce(
    (n, row) => n + (row.unknown_usage_calls ?? 0),
    0,
  );
  return {
    calls: receipts.reduce((n, row) => n + row.calls, 0),
    known_cost_usd: receipts.reduce((n, row) => n + row.known_cost_usd, 0),
    unknown_cost_calls: receipts.reduce(
      (n, row) => n + row.unknown_cost_calls,
      0,
    ),
    unknown_usage_calls: unknownUsage,
    usage: unknownUsage
      ? null
      : {
          input_tokens: receipts.reduce(
            (n, row) => n + (row.usage?.input_tokens ?? 0),
            0,
          ),
          output_tokens: receipts.reduce(
            (n, row) => n + (row.usage?.output_tokens ?? 0),
            0,
          ),
        },
  };
}
