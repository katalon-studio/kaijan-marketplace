import type { request } from "node:https";
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export interface SuppliedSource {
  schema: "pr-context-related/1";
  repo: string;
  title: string;
  text: string;
  source_uri: string;
  revision: string;
  captured_at: string;
  authorized_repositories?: string[];
}
export type RelatedInput = (
  { url: string; supplied?: never } | { supplied: SuppliedSource; url?: never }
) & {
  repositories?: string[];
  timeout?: number;
  maxCandidates?: number;
  maxRequests?: number;
  maxDiscovered?: number;
  commentFilter?: "off" | "actor-only" | "jev";
  commentOriginFilter?: boolean;
  actorPolicy?:
    | {
        exclude_actors: { login?: string; id?: number }[];
        comment_origin_filter?: boolean;
      }
    | Uint8Array;
  followDiscovered?: "off" | "matching";
  followthroughIntake?: "deterministic" | "jev";
  parentSelection?: "off" | "jev";
  githubTransport?: "gh" | "connected";
  sourcePrivacy?: "strict" | "quarantine-records";
  querySelection?:
    "deterministic" | "intent" | "intent-search" | "intent-search-v2";
  queryFallback?: "none" | "deterministic";
};
export interface GithubRequest {
  protocol:
    | "pcf-github-get/1"
    | "pcf-github-get/2"
    | "pcf-github-get/3"
    | "pcf-github-get/4";
  type: "github_get";
  run_id: string;
  id: string;
  method: "GET";
  url: string;
  endpoint: string;
  max_response_bytes?: number;
  max_frame_bytes?: number;
  deadline_at: string;
  source_privacy?: "quarantine-records";
}
export interface GithubResponse {
  protocol: GithubRequest["protocol"];
  run_id: string;
  id: string;
  url: string;
  outcome: "response" | "derived_response" | "unavailable";
  http_status: number | null;
  headers: Record<string, string> | null;
  body_complete: boolean | null;
  body: string | null;
  source_provenance?: Record<string, Json>;
}
export interface Accounting {
  calls: number;
  known_cost_usd: number;
  unknown_cost_calls: number;
  unknown_usage_calls?: number;
  usage?: Json;
  [key: string]: unknown;
}
export interface LexicalPlanningCoverage {
  status: "bounded" | "partial" | "unassessed";
  reason: string;
  query_character_budget: number;
  omitted_group_occurrences: number;
  semantic_coverage: "unassessed";
}
export interface SearchCoverage {
  requested_kinds: ("issue" | "pr")[];
  retrieved_kinds: ("issue" | "pr")[];
  omitted_kinds: ("issue" | "pr")[];
  lexical_planning?: LexicalPlanningCoverage;
  queries: {
    kind: "issue" | "pr";
    query: string;
    status: "not_inspected" | "requested" | "retrieved" | "omitted" | "failed";
    /** Original expression hash when partial state substitutes a placeholder. */
    query_sha256?: string;
    reason?: string;
    phase?: "initial" | "relaxed";
    observed_items?: number;
    retained_in_scope?: number;
    source_document_self_records?: number;
    eligible_non_seed?: number;
  }[];
}
export interface GenerationObservation {
  property: "title" | "body" | "text";
  span_start_codepoints: number;
  span_end_codepoints: number;
  content_sha256: string;
  declaration_sha256: string;
  classification: "uncertain" | "explicit_automated" | "explicit_generated";
  declaration_kind: "automated_creation" | "AI_generation";
}
export interface CommentOrigin {
  schema: "loki.github-comment-origin/1";
  enabled: boolean;
  exclude: boolean;
  reasons: ("github_bot_actor" | "github_app_attribution")[];
  actor_type: string | null;
  app_attribution:
    "identified" | "explicit_null" | "invalid_metadata" | "not_supplied";
  status:
    "identified_bot_or_app" | "user_account_origin_unverified" | "unknown";
  app_attribution_unknown: boolean;
  device_origin: "unknown";
  AI_authorship: "unassessed";
}
export interface CommentEligibility {
  schema: "loki.authored-record-eligibility/1";
  version: string;
  mode: "actor-only";
  role: "comment";
  decision: "retain" | "quarantine";
  reason: string;
  policy_sha256: string;
  module_sha256: string;
  original_record_sha256: string;
  policy_provided: boolean;
  policy_configured: boolean;
  unknown_author: boolean;
  comment_origin: CommentOrigin;
  content_provenance: GenerationObservation[];
  observed_generation_provenance?: GenerationObservation[];
  authorship_proven: false;
  coverage: "supplied_record_mechanical_only";
}
export interface CommentOriginCoverage {
  enabled: boolean;
  batches: {
    label: string;
    records_examined: number;
    decisions: CommentEligibility[];
  }[];
  AI_authorship: "unassessed";
  device_origin: "unknown";
}
export interface PartialCapture {
  coverage: "partial";
  authorized_repositories: string[];
  github_requests: number;
  max_github_requests: number;
  search_coverage: SearchCoverage;
  comment_origin_filter?: CommentOriginCoverage;
  seed_rechecked: boolean;
  omitted_literal_mentions: number;
  limitation: string;
  [key: string]: unknown;
}
/** output.schema.json remains authoritative for all native fields and bounds. */
export interface NativeRelatedResult {
  schema: "pr-context-related/1";
  version: string;
  status: "complete" | "partial" | "unavailable" | "stopped" | "refused";
  errors: string[];
  accounting: Accounting;
  /** Number of private batch artifacts written, not a provenance verdict. */
  comment_origin_batches?: number;
  partial_capture?: PartialCapture;
  scope?: {
    search_coverage?: SearchCoverage;
    comment_origin_filter?: CommentOriginCoverage;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export interface RelatedContext {
  signal: AbortSignal;
  /** New absolute leaf directory, whose parent exists. Never reused or overwritten. */
  artifactDirectory: string;
  /** Defaults to an empty snapshot, not the host's environment. */
  env?: Record<string, string | undefined>;
  /** Additional actual transport credential names bound through canonical exact-value screening. */
  credentialEnvNames?: string[];
  githubGet?: (
    request: GithubRequest,
    context: { signal: AbortSignal },
  ) => Promise<GithubResponse>;
  providerTransport?: typeof request;
  nativeTransport?: (
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: Uint8Array;
      timeoutMs: number;
    },
    context: { signal: AbortSignal },
  ) => Promise<{
    status: number;
    headers?: Record<string, string>;
    body: Uint8Array;
  }>;
}
export interface RelatedOperation {
  run(): Promise<NativeRelatedResult>;
}
/** Shared snapshot for callers that already hold native normalized input. */
export function createNormalizedRelatedWorkOperation(
  input: Record<string, unknown>,
  context: RelatedContext,
): RelatedOperation;
export function createRelatedWorkOperation(
  input: RelatedInput,
  context: RelatedContext,
): RelatedOperation;
export function runRelatedWork(
  input: RelatedInput,
  context: RelatedContext,
): Promise<NativeRelatedResult>;
export function admitGithubSource(
  request: GithubRequest,
  toolResult: Json,
  context: {
    signal: AbortSignal;
    env?: RelatedContext["env"];
    credentialEnvNames?: string[];
    mode?: "strict" | "quarantine-records";
  },
): Promise<GithubResponse>;
