// Shared supplied-assessment contract. Allow findings plus per-test observations.
export const SUPPLIED_TEST_EVIDENCE = "work-verifier/supplied-test-evidence/1";
export const SUPPLIED_ASSESSMENT = "work-verifier/supplied-test-assessment/1";
export const MODEL = "gpt-6-luna";
export const LIMITS = Object.freeze({
  images: 12,
  outputTokens: 12000,
  findings: 48,
  citations: 16,
  deadlineMs: 180000,
});
