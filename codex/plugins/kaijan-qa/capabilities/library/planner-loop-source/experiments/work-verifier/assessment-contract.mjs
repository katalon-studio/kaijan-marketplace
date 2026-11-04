// Shared supplied-assessment contract. Allow findings plus per-test observations.
export const SUPPLIED_TEST_EVIDENCE = "work-verifier/supplied-test-evidence/1";
export const SUPPLIED_ASSESSMENT = "work-verifier/supplied-test-assessment/1";
export const MODEL = "gpt-6-luna";
export const LIMITS = Object.freeze({
  // Keep full normal Runner sequences (80 calls / 150 inputs), including
  // explicit captures. This is a local bound, below provider image limits.
  images: 256,
  requestBytes: 32 * 1024 * 1024,
  // Reasoning and the cited per-test response share this allowance. Real
  // three-test packets exhausted 12k before the structured result was complete.
  outputTokens: 24000,
  findings: 48,
  citations: 16,
  deadlineMs: 180000,
});
