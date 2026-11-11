import { DEFAULT_BUDGETS, validateBudgets } from "./budgets.mjs";
import { check, parseUrl, suppliedSeed, repositoryScope } from "./records.mjs";

/** Native structured validation, shared by library and CLI. No acquisition. */
export function normalizeInput(input) {
  check(input && typeof input === "object", "invalid_input");
  check(
    Boolean(input.url) !== Boolean(input.supplied),
    "missing_or_ambiguous_seed",
  );
  const seed = input.url ? parseUrl(input.url) : suppliedSeed(input.supplied);
  check(
    !(input.repositories && seed.authorized_repositories),
    "ambiguous_repository_scope",
  );
  const repositories = repositoryScope(
    seed.repo,
    input.repositories ?? seed.authorized_repositories,
  );
  const budgets = {
    timeout: input.timeout ?? DEFAULT_BUDGETS.timeout,
    maxCandidates: input.maxCandidates ?? DEFAULT_BUDGETS.maxCandidates,
    maxRequests: input.maxRequests ?? DEFAULT_BUDGETS.maxRequests,
    maxDiscovered: input.maxDiscovered ?? DEFAULT_BUDGETS.maxDiscovered,
  };
  validateBudgets(budgets);
  const commentFilter = input.commentFilter ?? "actor-only";
  check(
    ["off", "actor-only", "jev"].includes(commentFilter),
    "invalid_comment_filter",
  );
  let actorPolicyBytes, policyOrigin;
  if (input.actorPolicy !== undefined) {
    actorPolicyBytes =
      input.actorPolicy instanceof Uint8Array
        ? Buffer.from(input.actorPolicy)
        : Buffer.from(JSON.stringify(input.actorPolicy));
    check(actorPolicyBytes.length <= 1024 * 1024, "invalid_input_file");
    const policy = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(actorPolicyBytes),
    );
    policyOrigin = policy.comment_origin_filter;
  }
  check(
    policyOrigin === undefined || typeof policyOrigin === "boolean",
    "invalid_comment_origin_filter",
  );
  const commentOriginFilter =
    input.commentOriginFilter ??
    (commentFilter === "off" ? false : policyOrigin !== false);
  check(
    typeof commentOriginFilter === "boolean",
    "invalid_comment_origin_filter",
  );
  const followDiscovered = input.followDiscovered ?? "matching";
  check(
    ["off", "matching"].includes(followDiscovered),
    "invalid_followthrough_mode",
  );
  const followthroughIntake = input.followthroughIntake ?? "deterministic";
  check(
    ["deterministic", "jev"].includes(followthroughIntake) &&
      (followthroughIntake !== "jev" || commentFilter === "jev"),
    "invalid_followthrough_intake",
  );
  const parentSelection = input.parentSelection ?? "off";
  check(
    ["off", "jev"].includes(parentSelection) &&
      (parentSelection !== "jev" || commentFilter === "jev"),
    "invalid_parent_selection",
  );
  const githubTransport = input.githubTransport ?? "gh";
  check(
    ["gh", "connected"].includes(githubTransport),
    "invalid_github_transport",
  );
  const sourcePrivacy = input.sourcePrivacy ?? "strict";
  check(
    ["strict", "quarantine-records"].includes(sourcePrivacy) &&
      (sourcePrivacy === "strict" || githubTransport === "connected"),
    "invalid_source_privacy",
  );
  const querySelection = input.querySelection ?? "deterministic";
  check(
    ["deterministic", "intent", "intent-search", "intent-search-v2"].includes(
      querySelection,
    ),
    "invalid_query_selection_mode",
  );
  const queryFallback = input.queryFallback ?? "none";
  check(
    ["none", "deterministic"].includes(queryFallback) &&
      (input.queryFallback === undefined ||
        querySelection === "intent-search-v2"),
    "invalid_query_fallback_policy",
  );
  return {
    seed,
    repositories,
    ...budgets,
    commentFilter,
    commentOriginFilter,
    actorPolicy: actorPolicyBytes ? true : undefined,
    actorPolicyBytes,
    followDiscovered,
    followthroughIntake,
    parentSelection,
    githubTransport,
    sourcePrivacy,
    querySelection,
    queryFallback,
    output: input.output,
  };
}
