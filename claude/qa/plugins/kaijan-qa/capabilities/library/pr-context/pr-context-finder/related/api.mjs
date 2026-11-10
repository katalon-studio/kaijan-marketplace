import { runRelatedWorkPlanner } from "./related-work-planner.mjs";
import { selectQueryWithPlanner } from "./query-agent.mjs";
import { sourceScreen } from "./source-screen.mjs";
import {
  DEFAULT_BUDGETS,
  validateBudgets,
  requestCapacity,
} from "./budgets.mjs";
import path from "node:path";
import { moduleService } from "./module-service.mjs";
import {
  serviceScreen,
  serviceFilter,
  serviceParent,
} from "./service-adapters.mjs";
import { performance } from "node:perf_hooks";
import { setTimeout, clearTimeout } from "node:timers";
import {
  CONTRACT,
  VERSION,
  check,
  RelatedError,
  hash,
  readBytes,
  recordStore,
} from "./records.mjs";
import { capture, githubReader } from "./capture.mjs";
import { connectedReader } from "./connected-transport.mjs";
import {
  buildRelatedWorkRankingRequest,
  outputText,
  validateJudgments,
  judgmentCoverage,
  primarySourceBinding,
} from "./rank.mjs";
import { evaluate, providerConfig } from "./provider.mjs";
import {
  INTENT_METHOD,
  QUERY_LIMITS,
  queryRequest,
  intentProfile,
  combinedAccounting,
} from "./intent-query.mjs";

import {
  SEARCH_METHOD,
  SEARCH_LIMITS,
  searchRequest,
  searchProfile,
  searchGetBudget,
} from "./search-intent.mjs";
import {
  AVAILABLE_METHOD,
  AVAILABLE_LIMITS,
  availableRequest,
  sourceRecord,
  availableRetrieval,
  modelIdentity,
} from "./query-availability.mjs";

import { normalizeInput } from "./input.mjs";

export function createNormalizedRelatedWorkOperation(args, context) {
  check(
    context &&
      typeof context.artifactDirectory === "string" &&
      path.isAbsolute(context.artifactDirectory),
    "missing_output_directory",
  );
  check(
    context.signal &&
      typeof context.signal.aborted === "boolean" &&
      typeof context.signal.throwIfAborted === "function" &&
      typeof context.signal.addEventListener === "function",
    "invalid_operation_signal",
  );
  const owned = structuredClone(args);
  if (args.actorPolicyBytes)
    owned.actorPolicyBytes = Buffer.from(args.actorPolicyBytes);
  // Compatibility callers may supply a policy path; capture its bytes now.
  else if (typeof args.actorPolicy === "string")
    owned.actorPolicyBytes = readBytes(args.actorPolicy);
  owned.output = context.artifactDirectory;
  const env = { ...(context.env ?? {}) };
  const providerTransport = context.providerTransport;
  const credentialEnvNames = [...(context.credentialEnvNames ?? [])];
  check(
    credentialEnvNames.every((name) => typeof name === "string"),
    "invalid_credential_binding",
  );
  const dependencies = {
    signal: context.signal,
    githubGet: context.githubGet,
    evaluateModel:
      context.evaluateModel ??
      ((...values) => evaluate(...values, providerTransport)),
    nativeTransport: context.nativeTransport,
    createChannel: context.createChannel,
    credentialEnvNames,
  };
  let promise;
  return Object.freeze({
    run() {
      return (promise ??= runEngine(owned, env, dependencies));
    },
  });
}

/** Snapshot before any async work; run() is idempotent for this operation. */
export function createRelatedWorkOperation(input, context) {
  return createNormalizedRelatedWorkOperation(
    normalizeInput(structuredClone(input)),
    context,
  );
}

export function runRelatedWork(input, context) {
  return createRelatedWorkOperation(input, context).run();
}

/** Canonical source-page admission for a connected provider's original receipt. */
export async function admitGithubSource(request, toolResult, context) {
  const env = { ...(context.env ?? {}) };
  const params = structuredClone({
    request,
    tool_result: toolResult,
    mode: context.mode ?? "strict",
  });
  params.credentialNames = [
    ...new Set([
      ...[
        "OPENAI_API_KEY",
        "OPENROUTER_API_KEY",
        "LOKI_OPENROUTER_API_KEY",
        "GH_TOKEN",
        "GITHUB_TOKEN",
      ].filter((name) => Boolean(env[name])),
      ...(context.credentialEnvNames ?? []),
    ]),
  ];
  const service = moduleService({
    env,
    signal: context.signal,
  });
  try {
    return await service.call("admit", params);
  } finally {
    await service.close();
  }
}

async function runEngine(
  args,
  env,
  {
    githubGet = null,
    evaluateModel = evaluate,
    signal,
    createChannel,
    nativeTransport,
    credentialEnvNames,
  } = {},
) {
  validateBudgets(args);
  check(
    args.querySelection === undefined ||
      ["deterministic", "intent", "intent-search", "intent-search-v2"].includes(
        args.querySelection,
      ),
    "invalid_query_selection_mode",
  );
  const available = args.querySelection === "intent-search-v2";
  const queryEnabled = ["intent", "intent-search", "intent-search-v2"].includes(
    args.querySelection,
  );
  const selector = available
    ? {
        method: AVAILABLE_METHOD,
        limits: AVAILABLE_LIMITS,
        request: availableRequest,
      }
    : args.querySelection === "intent-search"
      ? {
          method: SEARCH_METHOD,
          limits: SEARCH_LIMITS,
          request: searchRequest,
          profile: searchProfile,
        }
      : {
          method: INTENT_METHOD,
          limits: QUERY_LIMITS,
          request: queryRequest,
          profile: intentProfile,
        };
  const start = performance.now();
  const receipt = {
    calls: 0,
    known_cost_usd: 0,
    unknown_cost_calls: 0,
    usage: null,
  };
  const queryReceipt = {
    calls: 0,
    known_cost_usd: 0,
    unknown_cost_calls: 0,
    unknown_usage_calls: 0,
    usage: null,
  };
  const result = {
    schema: CONTRACT,
    version: VERSION,
    status: "unavailable",
    errors: [],
    github_calls: [],
    resource_preflight: {
      contract: "pcf-caller-budgets/1",
      caller_budgets: {
        timeout_ms: args.timeout,
        max_github_requests: args.maxRequests,
        max_discovered: args.maxDiscovered,
        max_candidates: args.maxCandidates,
      },
      defaults: DEFAULT_BUDGETS,
    },
    accounting: receipt,
  };
  if (queryEnabled)
    result.query_selection = {
      method: selector.method,
      status: "not_started",
      limits: {
        ...selector.limits,
        ...(Object.hasOwn(selector.limits, "search_GETs")
          ? {
              search_GETs: searchGetBudget(args.repositories),
            }
          : {}),
      },
      accounting: queryReceipt,
      semantic_support: "model_assertion_requires_review",
      ...(available
        ? {
            routing: {
              requested_method: AVAILABLE_METHOD,
              fallback_policy: args.queryFallback ?? "none",
              chosen_method: null,
              original_query_outcome: "not_started",
              reason: "not_started",
            },
          }
        : {}),
    };
  if (["actor-only", "jev"].includes(args.commentFilter) || args.actorPolicy)
    result.comment_filter = {
      mode: args.commentFilter === "off" ? "actor-only" : args.commentFilter,
      policy_configured: null,
      content_classification: "not_started",
      authorship_proven: false,
      records_examined: 0,
      deterministic_only_records: 0,
      jev_classified_records: 0,
      retained_without_content_classification: 0,
      pending_records: 0,
      calls: 0,
      known_cost_usd: 0,
      unknown_cost_calls: 0,
      batches: [],
    };
  if (args.parentSelection === "jev")
    result.parent_selection = {
      mode: "jev",
      calls: 0,
      known_cost_usd: 0,
      unknown_cost_calls: 0,
      unknown_usage_calls: 0,
      usage: [],
    };
  let store, channel, partialCapture;
  const controller = new globalThis.AbortController();
  let stopReason = "stopped";
  const stop = () => controller.abort();
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  const service = moduleService({
    env,
    signal: controller.signal,
    nativeTransport,
  });
  const timer = setTimeout(() => {
    stopReason = "deadline_exceeded";
    stop();
  }, args.timeout);
  try {
    store = recordStore(args.output);
    controller.signal.throwIfAborted();
    const screen = serviceScreen(
      service,
      env,
      controller.signal,
      credentialEnvNames,
    );
    if (args.actorPolicyBytes) {
      args.actorPolicy = path.join(args.output, "actor-policy.json");
      store.write("actor-policy.json", args.actorPolicyBytes);
    }
    result.source_screen = screen.declaration;
    await screen(args.seed);
    store.write("node-runtime.json", await service.call("runtime", {}));
    store.write("started.json", {
      schema: CONTRACT,
      version: VERSION,
      started_at: new Date().toISOString(),
      authorized_repositories: args.repositories,
      follow_discovered: args.followDiscovered,
      followthrough_intake: args.followthroughIntake,
      parent_selection: args.parentSelection ?? "off",
      limits: {
        timeout_ms: args.timeout,
        max_github_requests: args.maxRequests,
        max_discovered: args.maxDiscovered,
        max_candidates: args.maxCandidates,
        ...(queryEnabled ? { max_query_selection_calls: 1 } : {}),
      },
    });
    const filter =
      ["actor-only", "jev"].includes(args.commentFilter) || args.actorPolicy
        ? serviceFilter(
            service,
            path.join(args.output, "comment-filter"),
            args.actorPolicy,
            controller.signal,
            (row) => {
              const coverage = result.comment_filter;
              coverage.batches.push(row);
              coverage.policy_configured = row.policy_configured;
              for (const key of [
                "records_examined",
                "deterministic_only_records",
                "jev_classified_records",
                "retained_without_content_classification",
                "pending_records",
                "calls",
                "known_cost_usd",
                "unknown_cost_calls",
              ])
                coverage[key] += row[key];
              coverage.content_classification = coverage.pending_records
                ? "incomplete"
                : coverage.jev_classified_records
                  ? "native_jev"
                  : coverage.records_examined
                    ? "deterministic_only"
                    : "not_started";
              check(
                !row.unknown_cost_calls &&
                  !row.unknown_usage_calls &&
                  !row.pending_records,
                "intake_unknown_no_continuation",
              );
            },
            args.commentFilter === "off" ? "actor-only" : args.commentFilter,
            args.commentOriginFilter ?? args.commentFilter !== "off",
          )
        : null;
    const selectParent =
      args.parentSelection === "jev"
        ? serviceParent(
            service,
            path.join(args.output, "parent-selection"),
            controller.signal,
            (row) => Object.assign(result.parent_selection, row),
          )
        : null;
    const connected = args.githubTransport === "connected";
    check(!githubGet || connected, "ambiguous_github_transport");
    if (connected) {
      result.github_transport = {
        route: "connected",
        protocol:
          args.sourcePrivacy === "quarantine-records"
            ? "pcf-github-get/4"
            : "pcf-github-get/3",
        physical_request_count: null,
        pagination:
          "collector-selected bounded pages; headers never trigger extra requests",
      };
      channel = githubGet
        ? { fulfill: githubGet, close() {} }
        : createChannel?.({
            fail: stop,
            preserve: store.write,
            screenFrame: sourceScreen(env, undefined, credentialEnvNames),
          });
      check(
        channel && typeof channel.fulfill === "function",
        "invalid_connected_transport",
      );
    }
    const read = connected
      ? connectedReader({
          signal: controller.signal,
          calls: result.github_calls,
          preserve: store.write,
          repositories: args.repositories,
          maxRequests: args.maxRequests,
          deadlineAt: Date.now() + args.timeout - (performance.now() - start),
          fulfill: channel.fulfill,
          sourcePrivacy: args.sourcePrivacy ?? "strict",
          screen,
        })
      : githubReader(
          controller.signal,
          result.github_calls,
          store.write,
          undefined,
          screen,
          env,
          args.maxRequests,
        );
    const snapshot = await capture(
      args.seed,
      read,
      args.maxCandidates,
      filter,
      {
        originFilter: (records, enabled) =>
          service.call("origin", { records, enabled }),
        repositories: args.repositories,
        maxRequests: args.maxRequests,
        maxDiscovered: args.maxDiscovered,
        selectQueries: queryEnabled
          ? async (seed) => {
              const queryStore = recordStore(
                path.join(args.output, "query-selection"),
              );
              let querySignal;
              try {
                const request = selector.request(seed);
                const expectedRequestHash = available
                  ? hash(JSON.stringify(request))
                  : null;
                result.query_selection.source = {
                  source_uri: seed.url,
                  revision: seed.revision ?? seed.updated_at,
                  captured_at: seed.captured_at,
                  title_sha256: hash(seed.title),
                  body_sha256: hash(seed.body),
                };
                if (available) {
                  const source = sourceRecord(seed);
                  queryStore.write("source.json", source);
                  Object.assign(result.query_selection.source, {
                    original_source_sha256: source.original_source_sha256,
                    full_source_record: "query-selection/source.json",
                  });
                } else
                  queryStore.write(
                    "source.json",
                    result.query_selection.source,
                  );
                const capacity = requestCapacity(request, "query");
                result.resource_preflight.query = capacity;
                queryStore.write("capacity.json", capacity);
                check(capacity.status === "admitted", "request_too_large");
                const config = providerConfig(env);
                result.query_selection.status = "requested";
                querySignal = globalThis.AbortSignal.any([
                  controller.signal,
                  globalThis.AbortSignal.timeout(selector.limits.timeout_ms),
                ]);
                return await selectQueryWithPlanner({
                  request,
                  method: selector.method,
                  evaluate: () =>
                    evaluateModel(
                      request,
                      config,
                      queryStore,
                      querySignal,
                      queryReceipt,
                    ),
                  select(response) {
                    check(
                      queryReceipt.calls === 1 &&
                        !queryReceipt.unknown_cost_calls &&
                        !queryReceipt.unknown_usage_calls,
                      "query_accounting_unknown",
                    );
                    if (available)
                      return availableRetrieval({
                        seed,
                        request,
                        response,
                        receipt: queryReceipt,
                        expectedHash: expectedRequestHash,
                        signal: querySignal,
                        policy: args.queryFallback ?? "none",
                        repositories: args.repositories,
                        store: queryStore,
                        state: result.query_selection,
                      });
                    let candidate;
                    try {
                      candidate = JSON.parse(outputText(response));
                    } catch {
                      check(false, "query_output_invalid");
                    }
                    queryStore.write("candidate.json", candidate);
                    const profile = selector.profile(candidate, seed);
                    result.query_selection.status = profile.status;
                    result.query_selection.profile = profile;
                    queryStore.write("profile.json", profile);
                    check(
                      profile.status === "selected",
                      "query_selection_uncertain",
                    );
                    return profile;
                  },
                });
              } catch (error) {
                if (
                  result.query_selection.status !== "uncertain" &&
                  !(available && result.query_selection.status === "unusable")
                )
                  result.query_selection.status = "unavailable";
                if (
                  available &&
                  result.query_selection.routing.original_query_outcome ===
                    "not_started"
                ) {
                  Object.assign(result.query_selection.routing, {
                    original_query_outcome: result.query_selection.status,
                    reason: controller.signal.aborted
                      ? stopReason
                      : querySignal?.aborted
                        ? "query_selection_timeout"
                        : typeof error.code === "string"
                          ? error.code
                          : "query_stage_failed",
                    chosen_method: null,
                  });
                  queryStore.write(
                    "routing.json",
                    result.query_selection.routing,
                  );
                }
                if (querySignal?.aborted && !controller.signal.aborted)
                  throw new RelatedError("query_selection_timeout");
                throw error;
              } finally {
                queryStore.write("receipt.json", queryReceipt);
              }
            }
          : null,
        commentOriginFilter:
          args.commentOriginFilter ?? args.commentFilter !== "off",
        signal: controller.signal,
        env,
        onCommentOrigin(batch) {
          store.write(
            `comment-origin-${(result.comment_origin_batches = (result.comment_origin_batches ?? 0) + 1)}.json`,
            batch,
          );
        },
        onPartialState(readPartial) {
          partialCapture = readPartial;
        },
        followDiscovered: args.followDiscovered,
        followthroughIntake: args.followthroughIntake,
        parentSelector:
          args.parentSelection === "jev"
            ? async (body) => {
                check(
                  !result.comment_filter?.batches.some(
                    (b) =>
                      b.unknown_cost_calls ||
                      b.unknown_usage_calls ||
                      b.pending_records,
                  ),
                  "intake_unknown_no_continuation",
                );
                return selectParent(body);
              }
            : null,
      },
    );
    partialCapture = null;
    if (args.sourcePrivacy === "quarantine-records") {
      const pages = result.github_calls.filter((c) => c.source_provenance);
      snapshot.scope.source_privacy = {
        mode: args.sourcePrivacy,
        coverage: pages.length ? "partial" : "original_admitted_bodies",
        derived_pages: pages.length,
        omitted_records: pages.reduce(
          (n, c) => n + c.source_provenance.omitted_records,
          0,
        ),
        lineage:
          "Caller-declared original hash and derived subset hashes/counts in github_calls; omitted source is unavailable, not judged unrelated.",
      };
    }
    if (filter?.subjectProvenance) {
      snapshot.scope.authored_input = {
        role: "subject",
        interpretation:
          "Untrusted authored task assertions; AI disclosure is retained as provenance and never establishes truth or human authorship.",
        subject_provenance: filter.subjectProvenance,
      };
    }
    store.write("capture.json", snapshot);
    result.seed = snapshot.seed;
    result.literal_references = snapshot.literal_references;
    result.scope = snapshot.scope;
    result.evidence = snapshot.evidence;
    result.candidates = snapshot.candidates.map((item) => {
      const projected = {
        ...item,
        relation: "unjudged",
        relationship_type: "unjudged",
      };
      delete projected.body;
      return projected;
    });
    result.ranking = {
      retrieval:
        "bounded direct/concept/search admission, then literal/timeline first, concept score and task-term BM25 rank; full identity breaks ties",
      semantic: "not evaluated",
      coverage: judgmentCoverage(snapshot),
      calibrated: false,
    };
    if (snapshot.candidates.length) {
      check(
        !result.comment_filter?.batches.some(
          (b) =>
            b.unknown_cost_calls || b.unknown_usage_calls || b.pending_records,
        ),
        "intake_unknown_no_continuation",
      );
      const rankingRequest = buildRelatedWorkRankingRequest(snapshot);
      const capacity = requestCapacity(
        rankingRequest,
        "ranking",
        snapshot.candidates.length,
      );
      result.resource_preflight.ranking = capacity;
      store.write("ranking-capacity.json", capacity);
      check(capacity.status === "admitted", "request_too_large");
      const config = providerConfig(env);
      const rankingRequestHash = available
        ? hash(JSON.stringify(rankingRequest))
        : null;
      const candidate = await runRelatedWorkPlanner({
        request: rankingRequest,
        requestChangedCode: "ranking_sdk_request_changed",
        evaluate: () =>
          evaluateModel(
            rankingRequest,
            config,
            store,
            controller.signal,
            receipt,
          ),
        accept(response) {
          controller.signal.throwIfAborted();
          if (available)
            result.ranking_identity = modelIdentity(
              rankingRequest,
              response,
              receipt,
              rankingRequestHash,
              controller.signal,
            );
          const judgments = JSON.parse(outputText(response));
          store.write("candidate.json", judgments);
          return validateJudgments(judgments, snapshot);
        },
      });
      const coverage = judgmentCoverage(snapshot, candidate.judgments);
      result.ranking.coverage = coverage;
      const items = new Map(result.candidates.map((item) => [item.id, item]));
      const assessed = candidate.judgments.map((row, n) => ({
        ...items.get(row.candidate_id),
        ...row,
        semantic_rank: n + 1,
        semantic_rank_scope: coverage.order_scope,
        semantic_support: "model_assertion_requires_review",
        primary_source_binding: primarySourceBinding(
          row.candidate_id,
          snapshot,
        ),
      }));
      const seen = new Set(candidate.judgments.map((row) => row.candidate_id));
      result.candidates = [
        ...assessed,
        ...result.candidates.filter((item) => !seen.has(item.id)),
      ];
      result.ranking.semantic =
        coverage.status === "partial"
          ? "first validated model subset order only; omitted candidates are unassessed; no complete/global ranking or semantic correctness claim"
          : "first model judgment order over selected candidates; exact ID validation; semantic correctness still requires review";
    }
    result.status =
      (connected &&
        result.github_calls.some(
          (c) => c.visibility === "partial_metadata" || c.source_provenance,
        )) ||
      snapshot.scope.failures.length ||
      result.ranking.coverage.status === "partial" ||
      receipt.unknown_cost_calls ||
      receipt.unknown_usage_calls ||
      result.parent_selection?.unknown_cost_calls ||
      result.parent_selection?.unknown_usage_calls ||
      (args.actorPolicy &&
        result.comment_filter &&
        !result.comment_filter.policy_configured) ||
      result.comment_filter?.batches.some(
        (b) =>
          b.uncertain ||
          b.unknown_authors ||
          b.unknown_cost_calls ||
          b.unknown_usage_calls,
      )
        ? "partial"
        : "complete";
    result.message =
      "Results cover the stated bounded scope; empty or unsupported results do not establish absence of related work.";
  } catch (error) {
    if (partialCapture) Object.assign(result, partialCapture());
    const code = controller.signal.aborted
      ? stopReason
      : error.code && /^[a-z_]+$/.test(error.code)
        ? error.code
        : "operation_failed";
    result.errors.push(code);
    result.status = controller.signal.aborted
      ? "stopped"
      : result.candidates || result.literal_references?.length
        ? "partial"
        : "unavailable";
    if (result.partial_capture)
      result.message =
        "Capture failed. Any retained literal URLs are unjudged source mentions; discovery and semantic coverage are incomplete. No further requests were made after failure.";
  } finally {
    await channel?.close();
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
    await service.close();
    result.elapsed_ms = Math.round(performance.now() - start);
    if (queryEnabled) {
      result.ranking_accounting = receipt;
      result.accounting = combinedAccounting(queryReceipt, receipt);
    }
    if (store) {
      try {
        if (queryEnabled) store.write("ranking-receipt.json", receipt);
        store.write("receipt.json", result.accounting);
        store.write("result.json", result);
      } catch {
        result.errors.push("result_storage_failed");
        if (result.status !== "stopped") result.status = "partial";
      }
    }
  }
  return result;
}
