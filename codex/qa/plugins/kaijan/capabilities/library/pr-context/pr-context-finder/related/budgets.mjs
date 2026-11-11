import { Buffer } from "node:buffer";
import { check } from "./records.mjs";

export const DEFAULT_BUDGETS = Object.freeze({
  timeout: 180000,
  maxRequests: 24,
  maxCandidates: 12,
  maxDiscovered: 200,
});
// Node timers clamp a larger delay to 1ms. This route uses one ordinary timer.
export const MAX_TIMER_MS = 2147483647;
export const PROVIDER_PROFILE = Object.freeze({
  ranking_output_tokens: 5000,
});
export const positiveBudget = (value) =>
  Number.isSafeInteger(value) && value >= 1;
export function validateBudgets(budgets) {
  check(
    ["timeout", "maxRequests", "maxCandidates", "maxDiscovered"].every((key) =>
      positiveBudget(budgets[key]),
    ),
    "invalid_limits",
  );
  check(budgets.timeout <= MAX_TIMER_MS, "timer_capacity_exceeded");
  return budgets;
}
export function requestCapacity(request, stage, candidates = null) {
  const bytes = Buffer.byteLength(JSON.stringify(request));
  return {
    stage,
    capacity_basis:
      "exact serialized request bytes and JSON schema row allowance; not a tokenizer or semantic-completeness estimate",
    output_capacity:
      "finite output-token allowance; completion remains unverified until returned coverage validation",
    status: "admitted",
    request_bytes: bytes,
    max_request_bytes: null,
    max_output_tokens: request.max_output_tokens,
    candidates,
    output_schema_max_items:
      request.text?.format?.schema?.properties?.judgments?.maxItems ?? null,
    output_coverage:
      "One finite token-bounded response; complete typed coverage is checked on return, not guaranteed by a token estimate.",
    source_policy:
      "No request/source trimming or automatic second model sample to fit this profile.",
  };
}
