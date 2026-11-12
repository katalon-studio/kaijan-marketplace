import { DEFAULT_BUDGETS, positiveBudget } from "./budgets.mjs";
import { identitiesForScan, scanReferences } from "../reference-parser.mjs";
import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { performance } from "node:perf_hooks";
import { URL } from "node:url";
import { buildIndex, sourceSlice } from "../core.mjs";
import { retrievalProfile, retrievalQueryPlan } from "./retrieval.mjs";
import {
  check,
  hash,
  RelatedError,
  itemKey,
  sourceItemKey,
  repositoryScope,
  parseUrl,
} from "./records.mjs";

import { commentOrigin } from "../comment-origin.mjs";
import { candidateAdmission } from "./admission.mjs";
import { sourceScreen } from "./source-screen.mjs";
import {
  ConfirmedGithubNotFound,
  includedGhResponse,
  completeGhNotFound,
} from "./github-response.mjs";
import {
  SEARCH_METHOD,
  searchQueries,
  searchFeedback,
} from "./search-intent.mjs";
import {
  nominateIssues,
  parentRequest,
  parentModelRequest,
  selectParents,
  PARENT_LIMITS,
} from "./followthrough.mjs";

const execute = promisify(execFile);
export function githubReader(
  signal,
  calls,
  preserve = null,
  executeRequest = execute,
  screen = sourceScreen(process.env, signal),
  requestEnv = process.env,
  maxRequests = DEFAULT_BUDGETS.maxRequests,
) {
  check(positiveBudget(maxRequests), "invalid_limits");
  function persist(name, value) {
    if (!preserve) return;
    try {
      preserve(name, value);
    } catch {
      throw new RelatedError("github_receipt_storage_failed");
    }
  }
  return async (endpoint) => {
    check(calls.length < maxRequests, "github_request_limit");
    signal.throwIfAborted();
    await screen(endpoint);
    const number = calls.length + 1;
    const call = {
      endpoint,
      started_at: new Date().toISOString(),
      status: "dispatch_intent",
    };
    persist(`github-intent-${number}.json`, call);
    calls.push(call);
    const start = performance.now();
    let stdout = Buffer.alloc(0),
      stderr = Buffer.alloc(0),
      parsedOutput = null;
    // Record the pending completion so cleanup retains its original failure precedence.
    let nativeOperationValue, nativeOperationFailure;
    let nativeOperationFailed = false;
    try {
      nativeOperation: {
        try {
          let response, executionError;
          try {
            response = await executeRequest(
              "gh",
              [
                "api",
                "--hostname",
                "github.com",
                "--method",
                "GET",
                "--include",
                endpoint,
              ],
              {
                signal,
                timeout: 90000,
                maxBuffer: Infinity,
                encoding: "buffer",
                env: requestEnv,
              },
            );
          } catch (error) {
            executionError = error;
            response = {
              stdout: error.stdout ?? stdout,
              stderr: error.stderr ?? stderr,
            };
            call.exit_code = typeof error.code === "number" ? error.code : null;
          }
          stdout = Buffer.from(response.stdout);
          stderr = Buffer.from(response.stderr ?? "");
          const included = includedGhResponse(stdout);
          if (included) call.http_status = included.status;
          parsedOutput = JSON.parse(
            new globalThis.TextDecoder("utf-8", { fatal: true }).decode(
              included?.body ?? stdout,
            ),
          );
          signal.throwIfAborted();
          if (completeGhNotFound(included, executionError, parsedOutput)) {
            call.failure = "not_found";
            call.body_complete = true;
            call.unknown_effects = false;
            throw new ConfirmedGithubNotFound();
          }
          if (executionError) throw executionError;
          check(
            !included || (included.status >= 200 && included.status < 300),
            "github_unavailable",
          );
          call.status = "received";
          {
            nativeOperationValue = parsedOutput;
            break nativeOperation;
          }
        } catch (error) {
          stdout = Buffer.from(error.stdout ?? stdout);
          stderr = Buffer.from(error.stderr ?? stderr);
          call.status = signal.aborted ? "stopped" : "failed";
          call.exit_code ??= typeof error.code === "number" ? error.code : null;
          // No automatic continuation or replay after an unconfirmed acquisition.
          if (!signal.aborted && error instanceof ConfirmedGithubNotFound)
            throw error;
          throw new RelatedError(
            signal.aborted ? "stopped" : "github_unavailable",
          );
        }
      }
    } catch (error) {
      nativeOperationFailed = true;
      nativeOperationFailure = error;
    }
    {
      call.elapsed_ms = Math.round(performance.now() - start);
      call.stdout_bytes = stdout.length;
      call.stdout_sha256 = hash(stdout);
      call.stderr_bytes = stderr.length;
      call.stderr_sha256 = hash(stderr);
      try {
        const text = stdout.toString("utf8");
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* Failed output may be plain text. */
        }
        const diagnostic = stderr.toString("utf8");
        await (screen.preserve ?? screen)([
          text,
          diagnostic,
          parsedOutput,
          parsed,
        ]);
      } catch (error) {
        call.status = "source_refused";
        persist(`github-receipt-${number}.json`, call);
        throw new RelatedError(
          error.code === "source_privacy"
            ? "source_privacy"
            : "source_screen_unavailable",
        );
      }
      try {
        persist(`github-raw-${number}.json`, stdout);
        persist(`github-stderr-${number}.txt`, stderr);
      } finally {
        persist(`github-receipt-${number}.json`, call);
      }
    }
    if (nativeOperationFailed) throw nativeOperationFailure;
    return nativeOperationValue;
  };
}
function project(item, repo, includeAuthor = false) {
  check(
    item &&
      Number.isSafeInteger(item.number) &&
      item.number > 0 &&
      typeof item.title === "string" &&
      typeof item.updated_at === "string" &&
      (item.body === null ||
        item.body === undefined ||
        typeof item.body === "string"),
    "invalid_github_record",
  );
  const kind = item.pull_request ? "pr" : "issue";
  return {
    repo,
    key: itemKey({ repo, number: item.number }),
    number: item.number,
    kind,
    title: item.title,
    body: item.body ?? "",
    ...(includeAuthor ? { id: item.id, user: item.user } : {}),
    state: item.state,
    url: `https://github.com/${repo}/${kind === "pr" ? "pull" : "issues"}/${item.number}`,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export { references } from "./reference-api.mjs";
function excerpt(text, limit) {
  return sourceSlice(String(text), 0, limit);
}
function evidence(id, item, text, limit) {
  const selected = excerpt(text, limit);
  return {
    id,
    source_uri: item.url,
    revision: item.updated_at ?? item.revision,
    captured_at: item.captured_at,
    text: selected,
    sha256: hash(selected),
    omitted_characters: text.length - selected.length,
    source_role: "authored_metadata",
  };
}

export async function capture(
  seedInput,
  read,
  maxCandidates = DEFAULT_BUDGETS.maxCandidates,
  filter = null,
  options = {},
) {
  const originEnabled =
    options.commentOriginFilter ?? filter?.commentOriginFilter ?? true;
  check(
    typeof originEnabled === "boolean" &&
      (filter?.commentOriginFilter === undefined ||
        filter.commentOriginFilter === originEnabled),
    "invalid_comment_origin_filter",
  );
  const originBatches = [];
  const capturedAt = new Date().toISOString();
  const repo = seedInput.repo;
  const repositories = repositoryScope(
    repo,
    options.repositories ?? seedInput.authorized_repositories,
  );
  const allowed = new Set(repositories);
  const maxRequests = options.maxRequests ?? DEFAULT_BUDGETS.maxRequests;
  const maxDiscovered = options.maxDiscovered ?? DEFAULT_BUDGETS.maxDiscovered;
  check(
    [maxCandidates, maxRequests, maxDiscovered].every(positiveBudget),
    "invalid_limits",
  );
  const omissions = [],
    failures = [],
    sources = [],
    searches = [],
    uninspected = [];
  const coverage = new Map(
    repositories.map((r) => [
      r,
      {
        repo: r,
        requests: 0,
        stages: [],
        candidate_count: 0,
        selected_count: 0,
      },
    ]),
  );
  let requests = 0,
    reserved = 0;
  async function acquire(endpoint, targetRepo, stage, optional = false) {
    if (requests >= maxRequests - (optional ? reserved : 0)) {
      if (!optional) throw new RelatedError("github_request_limit");
      failures.push({ stage, repo: targetRepo, code: "github_request_limit" });
      coverage.get(targetRepo)?.stages.push({
        stage,
        status: "not_inspected",
        reason: "global_request_limit",
      });
      return null;
    }
    requests++;
    const row = coverage.get(targetRepo);
    if (row) row.requests++;
    try {
      const data = await read(endpoint);
      row?.stages.push({ stage, status: "received" });
      return data;
    } catch (error) {
      row?.stages.push({
        stage,
        status: "failed",
        code: error.code ?? "invalid_github_response",
      });
      if (
        optional &&
        stage === "literal_reference" &&
        error instanceof ConfirmedGithubNotFound
      ) {
        failures.push({
          stage,
          repo: targetRepo,
          code: "github_not_found",
          endpoint,
          http_status: 404,
          meaning: "absent_or_inaccessible_unresolved",
        });
        return null;
      }
      if (
        !optional ||
        [
          "stopped",
          "github_unavailable",
          "github_receipt_storage_failed",
          "source_privacy",
          "source_screen_unavailable",
          "source_control_limit",
          "comment_filter_incomplete",
        ].includes(error.code) ||
        error.name === "AbortError"
      )
        throw error;
      failures.push({
        stage,
        repo: targetRepo,
        code: error.code ?? "invalid_github_response",
      });
      return null;
    }
  }
  const endpoint = `repos/${repo}`;
  let seed = seedInput,
    primary,
    initialPr;
  if (seed.kind !== "supplied") {
    primary = await acquire(
      `${endpoint}/issues/${seed.number}`,
      repo.toLowerCase(),
      "seed",
    );
    if (
      filter &&
      !(await retained([primary], "seed_actor", false, "subject")).length
    )
      throw new RelatedError("seed_intake_excluded");
    const item = project(primary, repo, Boolean(filter));
    check(item.number === seedInput.number, "seed_identity_mismatch");
    check(item.kind === seed.kind, "seed_route_type_mismatch");
    seed = { ...item, captured_at: capturedAt };
    if (seed.kind === "pr") {
      initialPr = await acquire(
        `${endpoint}/pulls/${seed.number}`,
        repo.toLowerCase(),
        "seed_pr",
      );
      seed.head_sha = initialPr.head.sha;
      seed.base_sha = initialPr.base.sha;
    }
    reserved = initialPr ? 2 : 1;
  } else if (
    filter &&
    !(await retained([seed], "supplied_seed_intake", false, "subject")).length
  ) {
    throw new RelatedError("seed_intake_excluded");
  }
  const followMode = options.followDiscovered ?? "matching";
  const seedKey = sourceItemKey(seed);
  check(["off", "matching"].includes(followMode), "invalid_followthrough_mode");
  const followthroughIntake = options.followthroughIntake ?? "deterministic";
  check(
    ["deterministic", "jev"].includes(followthroughIntake) &&
      (followthroughIntake !== "jev" || filter),
    "invalid_followthrough_intake",
  );
  const followEnabled = followMode === "matching" && seed.kind === "supplied";
  const semanticParent = options.parentSelector;
  const followReserve =
    followEnabled && semanticParent
      ? Math.min(
          6,
          Math.max(
            0,
            maxRequests - reserved - requests - repositories.length - 2,
          ),
        )
      : 0;
  reserved += followReserve;
  const followSources = [];
  const followthrough = {
    mode: followMode,
    intake: followthroughIntake,
    status: followEnabled
      ? "pending"
      : followMode === "off"
        ? "disabled"
        : "seed_already_expanded",
    reserved_requests: followReserve,
    max_issues: 2,
    max_depth: 2,
    max_additional_literal_fetches: 2,
    ambiguous: false,
    selection: "native_decisions_opt_in",
    selection_limits: PARENT_LIMITS,
    judgments: [],
    omitted: [],
    matches: [],
    expanded: [],
    skipped: [],
  };
  function notInspected(ref, channel, sourceUri, reason) {
    const row = {
      key: itemKey(ref),
      repo: ref.repo.toLowerCase(),
      number: ref.number,
      channel,
      source_uri: sourceUri,
      reason,
    };
    if (
      !uninspected.some(
        (prior) => JSON.stringify(prior) === JSON.stringify(row),
      )
    )
      uninspected.push(row);
  }
  function add(item, channel, link) {
    check(
      allowed.has(item.repo.toLowerCase()),
      "record_outside_repository_scope",
    );
    admission.observe({ ...item, captured_at: capturedAt }, channel, link);
  }
  async function retained(records, label, classify = false, role = "evidence") {
    let input = records,
      decisions;
    if (role === "comment" && filter?.commentOriginFilter === undefined) {
      const origin = await (options.originFilter ?? commentOrigin)(
        records,
        originEnabled,
        options.signal,
        options.env,
      );
      input = origin.records;
      decisions = origin.decisions;
    }
    const kept = filter ? await filter(input, label, classify, role) : input;
    if (role === "comment") {
      decisions ??= filter.lastEligibility;
      const batch = { label, records_examined: records.length, decisions };
      originBatches.push(batch);
      options.onCommentOrigin?.(batch);
    }
    check(Array.isArray(kept), "authored_filter_changed_record");
    const originals = new Map();
    for (const record of records) {
      const key = hash(JSON.stringify(record));
      originals.set(key, (originals.get(key) ?? 0) + 1);
    }
    for (const record of kept) {
      const key = hash(JSON.stringify(record));
      const n = originals.get(key) ?? 0;
      check(n > 0, "authored_filter_changed_record");
      originals.set(key, n - 1);
    }
    return kept;
  }
  async function candidateRecords(records, channel, label, repoFor) {
    const fetched = new Map();
    for (const item of records) {
      const target = repoFor(item).toLowerCase();
      fetched.set(target, (fetched.get(target) ?? 0) + 1);
    }
    const kept = await retained(records, label);
    const exactKept = new Map();
    for (const record of kept) {
      const key = hash(JSON.stringify(record));
      exactKept.set(key, (exactKept.get(key) ?? 0) + 1);
    }
    for (const record of records) {
      const key = hash(JSON.stringify(record));
      const n = exactKept.get(key) ?? 0;
      if (n) exactKept.set(key, n - 1);
      else if (Number.isSafeInteger(record.number))
        quarantine(itemKey({ repo: repoFor(record), number: record.number }));
    }
    const remaining = new Map();
    for (const item of kept) {
      const target = repoFor(item).toLowerCase();
      remaining.set(target, (remaining.get(target) ?? 0) + 1);
    }
    for (const [target, n] of fetched) {
      admission.fetched(target, channel, n);
      admission.quarantined(target, channel, n - (remaining.get(target) ?? 0));
    }
    return kept;
  }
  const referenceParsing = [];
  function sourceReferences(source, sourceRepo) {
    const scan = scanReferences(source.text, sourceRepo);
    referenceParsing.push({ source_uri: source.url, ...scan });
    return identitiesForScan(scan, true);
  }
  const literalRefs = new Map(),
    blockedRefs = new Set();
  let omittedLiteralMentions = 0,
    seedRechecked = false;
  const searchPlans = [];
  let lexicalPlanning = undefined;
  let feedback;
  function searchCoverage(discloseQueries = true) {
    return {
      requested_kinds: ["issue", "pr"],
      retrieved_kinds: ["issue", "pr"].filter((kind) =>
        searchPlans.some((p) => p.kind === kind && p.status === "retrieved"),
      ),
      omitted_kinds: ["issue", "pr"].filter(
        (kind) =>
          !searchPlans.some((p) => p.kind === kind) ||
          searchPlans.some((p) => p.kind === kind && p.status !== "retrieved"),
      ),
      queries: discloseQueries
        ? searchPlans
        : searchPlans.map((plan) => ({
            ...plan,
            query:
              "[source-derived expression omitted from partial identity state]",
            query_sha256: hash(plan.query),
          })),
      ...(lexicalPlanning ? { lexical_planning: lexicalPlanning } : {}),
    };
  }
  function quarantine(key) {
    blockedRefs.add(key);
    literalRefs.delete(key);
    admission.quarantine(key);
  }
  function remember(ref, source, depth) {
    const key = itemKey(ref);
    if (
      key === seedKey ||
      !allowed.has(ref.repo.toLowerCase()) ||
      blockedRefs.has(key)
    )
      return;
    let uri;
    try {
      uri = new URL(source.url);
    } catch {
      return;
    }
    if (
      !["https:", "urn:"].includes(uri.protocol) ||
      uri.username ||
      uri.password
    )
      return;
    let row = literalRefs.get(key);
    if (!row) {
      if (literalRefs.size >= 200) {
        omittedLiteralMentions++;
        return;
      }
      row = {
        key,
        repo: ref.repo.toLowerCase(),
        number: ref.number,
        url: ref.url,
        retrieved: false,
        provenance: [],
        omitted_provenance: 0,
      };
      literalRefs.set(key, row);
    }
    row.url ??= ref.url;
    const provenance = {
      type: "literal_reference",
      source_uri: source.url,
      source_text_sha256: hash(source.text),
      captured_at: capturedAt,
      depth,
    };
    if (
      !row.provenance.some(
        (p) => JSON.stringify(p) === JSON.stringify(provenance),
      )
    ) {
      if (row.provenance.length < 9) row.provenance.push(provenance);
      else row.omitted_provenance++;
    }
  }
  function literalReferences() {
    return [...literalRefs.values()]
      .filter((r) => r.url && !blockedRefs.has(r.key))
      .map((r) => ({
        ...r,
        relation: "unjudged",
        relationship_type: "unjudged",
      }));
  }
  // Publish a pure read of admitted identities, never raw pending source. The
  // normal runner reads this only when capture throws; it cannot resume effects.
  options.onPartialState?.(() => ({
    literal_references: literalReferences(),
    partial_capture: {
      coverage: "partial",
      authorized_repositories: repositories,
      github_requests: requests,
      max_github_requests: maxRequests,
      search_coverage: searchCoverage(false),
      comment_origin_filter: {
        enabled: originEnabled,
        batches: originBatches,
        AI_authorship: "unassessed",
        device_origin: "unknown",
      },
      ...(feedback ? { search_feedback: feedback } : {}),
      seed_rechecked: seedRechecked,
      omitted_literal_mentions: omittedLiteralMentions,
      uninspected_references: uninspected,
      // Partial identity state is not a publication of unadmitted source text.
      reference_parsing: referenceParsing.map(({ mentions, ...scan }) => ({
        ...scan,
        mentions: mentions.map(
          ({ literal, destination, ...mention }) => (
            void literal,
            void destination,
            mention
          ),
        ),
      })),
      limitation:
        "Previously admitted authored literal references only; no semantic judgment or target-content claim. Capture failed; no continuation is authorized.",
    },
  }));
  const primarySource = {
    ...seed,
    text: `${seed.title}\n${seed.body}`,
    limit: 7000,
  };
  for (const ref of sourceReferences(primarySource, repo)) {
    if (!allowed.has(ref.repo.toLowerCase()))
      notInspected(
        ref,
        "literal_reference",
        primarySource.url,
        "repository_not_authorized",
      );
    else remember(ref, primarySource, 1);
  }
  let comments = [],
    timeline = [];
  // Exact admitted source mentions exist before any optional query-model effect.
  // Failure/uncertainty stops here; partial state can retain those unjudged links.
  const retrieval = options.selectQueries
    ? await options.selectQueries(seed)
    : retrievalProfile(seed);
  const adaptive = [SEARCH_METHOD, "intent-search/2"].includes(
    retrieval.method,
  );
  const lexicalPlan = adaptive
    ? null
    : retrievalQueryPlan(retrieval, repositories);
  lexicalPlanning = lexicalPlan?.coverage;
  searchPlans.push(
    ...(adaptive
      ? searchQueries(retrieval, repositories)
      : lexicalPlan.queries
    ).map((query) => ({
      kind: query.endsWith(" is:issue") ? "issue" : "pr",
      query,
      status: "not_inspected",
      reason: "not_reached",
      ...(adaptive ? { phase: "initial" } : {}),
    })),
  );
  const admission = candidateAdmission(
    seed,
    repositories,
    maxDiscovered,
    retrieval,
  );
  const candidates = admission.pool;
  if (seed.number) {
    comments =
      (await acquire(
        `${endpoint}/issues/${seed.number}/comments?per_page=100`,
        repo.toLowerCase(),
        "seed_comments",
        true,
      )) ?? [];
    check(
      Array.isArray(comments) && comments.length <= 100,
      "invalid_comments",
    );
    if (comments.length === 100)
      omissions.push("seed comments after first 100 not inspected");
    timeline =
      (await acquire(
        `${endpoint}/issues/${seed.number}/timeline?per_page=100`,
        repo.toLowerCase(),
        "seed_timeline",
        true,
      )) ?? [];
    check(
      Array.isArray(timeline) && timeline.length <= 100,
      "invalid_timeline",
    );
    if (timeline.length === 100)
      omissions.push("timeline after first 100 events not inspected");
  }
  {
    comments = await retained(comments, "seed_comments", true, "comment");
    omissions.push(
      filter?.mode !== "jev"
        ? "Comment-origin metadata and explicit actor policy applied; missing attribution remains unknown. Content-generation prose is provenance, not an exclusion. See private receipts."
        : "Opt-in JEV comment quarantine: generated/uncertain records withheld; retained classifications do not prove human authorship. See private receipts.",
    );
  }
  sources.push(primarySource);
  for (const comment of comments)
    sources.push({
      url: `${seed.url}#issuecomment-${comment.id}`,
      updated_at: comment.updated_at,
      captured_at: capturedAt,
      text: String(comment.body ?? ""),
      limit: 1500,
    });
  if (sources.length > 9)
    omissions.push(
      `${sources.length - 9} seed comments excluded from model evidence (references still parsed)`,
    );
  let fetched = 0,
    followFetched = 0;
  async function expandSources(
    origin,
    sourceList,
    timelineEvents,
    depth = 1,
    evidenceId = null,
  ) {
    const refs = new Map();
    for (const source of sourceList)
      for (const ref of sourceReferences(source, origin.repo)) {
        remember(ref, source, depth);
        if (itemKey(ref) === sourceItemKey(origin) || itemKey(ref) === seedKey)
          continue;
        if (!allowed.has(ref.repo.toLowerCase())) {
          notInspected(
            ref,
            "literal_reference",
            source.url,
            "repository_not_authorized",
          );
          continue;
        }
        const key = itemKey(ref);
        const link = {
          type: "literal_reference",
          depth,
          ...(depth === 2
            ? { via_issue_key: origin.key, source_evidence_id: evidenceId }
            : {}),
          source_uri: source.url,
          target_key: key,
          explanation:
            "Source metadata contains a literal reference; a mention is not proof of semantic relevance.",
        };
        if (!refs.has(key))
          refs.set(key, { ...ref, repo: ref.repo.toLowerCase(), links: [] });
        refs.get(key).links.push(link);
      }
    const events = timelineEvents.filter(
      (event) => event.event === "cross-referenced" && event.source?.issue,
    );
    const keptEvents = new Set(
      (await retained(events, "timeline_event_actors")).map((event) =>
        hash(JSON.stringify(event)),
      ),
    );
    for (const event of events) {
      const raw = event.source.issue;
      let ref;
      try {
        ref = parseUrl(raw.html_url);
      } catch {
        omissions.push(
          "timeline item without a valid GitHub issue/PR URL not inspected",
        );
        continue;
      }
      if (itemKey(ref) === sourceItemKey(origin) || itemKey(ref) === seedKey)
        continue;
      const sourceUri = event.html_url ?? origin.url;
      if (!keptEvents.has(hash(JSON.stringify(event)))) {
        // Identity-only quarantine accounting is not eligible link evidence.
        if (allowed.has(ref.repo.toLowerCase())) {
          admission.fetched(ref.repo, "timeline", 1);
          admission.quarantined(ref.repo, "timeline", 1);
        }
        continue;
      }
      if (!allowed.has(ref.repo.toLowerCase())) {
        notInspected(ref, "timeline", sourceUri, "repository_not_authorized");
        continue;
      }
      admission.fetched(ref.repo, "timeline", 1);
      check(ref.number === raw.number, "timeline_identity_mismatch");
      check(
        project(raw, ref.repo).kind === ref.kind,
        "timeline_identity_mismatch",
      );
      const keptItems = await retained([raw], "timeline_candidate_actor");
      admission.quarantined(ref.repo, "timeline", 1 - keptItems.length);
      if (!keptItems.length) quarantine(itemKey(ref));
      for (const value of keptItems)
        add(
          project(value, ref.repo.toLowerCase(), Boolean(filter)),
          "timeline",
          {
            type: "timeline_cross_reference",
            depth,
            ...(depth === 2
              ? { via_issue_key: origin.key, source_evidence_id: evidenceId }
              : {}),
            source_uri: sourceUri,
            target_key: itemKey(ref),
            target_uri: ref.url,
            event_at: event.created_at,
            explanation:
              "GitHub timeline records this item referencing the source issue; semantic relevance is separate.",
          },
        );
    }
    for (const [key, ref] of refs) {
      const existing = candidates.get(key);
      if (existing) {
        const literal = literalRefs.get(key);
        if (literal) {
          literal.url = existing.url;
          literal.retrieved = true;
        }
        admission.fetched(ref.repo, "literal_reference", 1);
        for (const link of ref.links) add(existing, "literal_reference", link);
        continue;
      }
      if (fetched >= 8 || (depth === 2 && followFetched >= 2)) {
        notInspected(
          ref,
          "literal_reference",
          ref.links[0].source_uri,
          "literal_fetch_limit",
        );
        continue;
      }
      fetched++;
      if (depth === 2) followFetched++;
      const value = await acquire(
        `repos/${ref.repo}/issues/${ref.number}`,
        ref.repo,
        "literal_reference",
        true,
      );
      if (!value) {
        notInspected(
          ref,
          "literal_reference",
          ref.links[0].source_uri,
          "acquisition_unavailable",
        );
        continue;
      }
      check(value.number === ref.number, "reference_identity_mismatch");
      for (const record of await candidateRecords(
        [value],
        "literal_reference",
        "literal_candidate_actor",
        () => ref.repo,
      )) {
        const literal = literalRefs.get(key);
        if (literal) {
          literal.url = project(record, ref.repo).url;
          literal.retrieved = true;
        }
        for (const link of ref.links)
          add(
            project(record, ref.repo, Boolean(filter)),
            "literal_reference",
            link,
          );
      }
    }
  }
  await expandSources(seed, sources, timeline);
  for (const target of repositories) {
    const recent =
      (await acquire(
        `repos/${target}/issues?state=all&sort=created&direction=desc&per_page=100`,
        target,
        "recent",
        true,
      )) ?? [];
    check(Array.isArray(recent) && recent.length <= 100, "invalid_recent");
    for (const item of await candidateRecords(
      recent,
      "recent",
      "recent_candidate_actors",
      () => target,
    ))
      add(project(item, target, Boolean(filter)), "recent");
    if (recent.length === 100)
      omissions.push(`${target}: recent window limited to 100 items`);
  }
  const eligibleSearch = new Set();
  const isSelf = (item) => itemKey(item) === seedKey;
  async function runSearch(plan) {
    const q = plan.query;
    searches.push(q);
    const before = requests;
    plan.status = "requested";
    delete plan.reason;
    try {
      const result = await acquire(
        `search/issues?q=${encodeURIComponent(q)}&per_page=20&advanced_search=true`,
        repo.toLowerCase(),
        "search",
        true,
      );
      plan.status = result ? "requested" : "omitted";
      if (!result)
        plan.reason =
          requests === before
            ? "global_request_limit"
            : "acquisition_unavailable";
      const searchRepos = new Set(
        [
          ...(adaptive ? q.slice(0, q.indexOf(") in:title,body")) : q).matchAll(
            /repo:([^\s()]+)/g,
          ),
        ].map((m) => m[1]),
      );
      for (const row of coverage.values())
        if (searchRepos.has(row.repo))
          row.stages.push({
            stage: "scoped_search",
            status: result ? "received" : "not_inspected",
            query: q,
          });
      if (!result) return;
      check(
        Array.isArray(result.items) && result.items.length <= 20,
        "invalid_search",
      );
      const scopedItems = [];
      for (const item of result.items) {
        const ref = parseUrl(item.html_url);
        check(
          ref.number === item.number &&
            project(item, ref.repo).kind === ref.kind &&
            ref.kind === plan.kind,
          "search_identity_mismatch",
        );
        if (!allowed.has(ref.repo.toLowerCase())) {
          notInspected(
            ref,
            "search",
            `https://github.com/search?q=${encodeURIComponent(q)}`,
            "repository_not_authorized",
          );
          continue;
        }
        scopedItems.push(item);
      }
      const kept = await candidateRecords(
        scopedItems,
        "search",
        "search_candidate_actors",
        (row) => parseUrl(row.html_url).repo,
      );
      const observedEligible = new Set();
      let selfRecords = 0;
      for (const item of kept) {
        const projected = project(
          item,
          parseUrl(item.html_url).repo.toLowerCase(),
          Boolean(filter),
        );
        if (isSelf(projected)) selfRecords++;
        else if (!blockedRefs.has(projected.key)) {
          observedEligible.add(projected.key);
          eligibleSearch.add(projected.key);
        }
        add(projected, "search");
      }
      if (adaptive)
        Object.assign(plan, {
          observed_items: result.items.length,
          retained_in_scope: kept.length,
          source_document_self_records: selfRecords,
          eligible_non_seed: observedEligible.size,
        });
      if (result.incomplete_results || result.total_count > result.items.length)
        omissions.push(`search ${q}: partial/top 20`);
      plan.status = "retrieved";
    } catch (error) {
      plan.status = "failed";
      plan.reason = error.code ?? "invalid_github_response";
      throw error;
    }
  }
  for (const plan of searchPlans) await runSearch(plan);
  if (adaptive) {
    feedback = searchFeedback(
      retrieval,
      repositories,
      searchPlans,
      [...eligibleSearch].filter((key) => !blockedRefs.has(key)).length,
    );
    if (feedback.status === "planned") {
      const relaxed = feedback.queries.map((query) => ({
        kind: query.endsWith(" is:issue") ? "issue" : "pr",
        query,
        phase: "relaxed",
        status: "not_inspected",
        reason: "not_reached",
      }));
      searchPlans.push(...relaxed);
      feedback.status = "running";
      try {
        for (const plan of relaxed) await runSearch(plan);
      } finally {
        feedback.status = relaxed.every((plan) => plan.status === "retrieved")
          ? "completed"
          : "partial";
        feedback.final_eligible_non_seed_observed = [...eligibleSearch].filter(
          (key) => !blockedRefs.has(key),
        ).length;
      }
    }
  }
  if (followEnabled) {
    // Release the reserved hop requests after bounded base discovery.
    reserved -= followReserve;
    const nomination = nominateIssues(seed, [...candidates.values()]);
    followthrough.method = nomination.method;
    followthrough.issue_count = nomination.issue_count;
    followthrough.omitted = nomination.omitted;
    followthrough.nominated_keys = nomination.nominated.map((c) => c.key);
    const parents = [];
    let selection = {
      matches: [],
      selected: [],
      judgments: [],
      ambiguous: false,
      status: "semantic_selection_not_requested",
    };
    if (
      semanticParent &&
      nomination.nominated.length &&
      maxRequests - reserved - requests >= 2
    ) {
      // Provenance intake precedes every semantic input; no re-fill after quarantine.
      const eligible = await retained(
        nomination.nominated,
        "followthrough_parent_content",
        followthroughIntake === "jev",
      );
      const eligibleKeys = new Set(eligible.map((c) => c.key));
      for (const item of nomination.nominated)
        if (!eligibleKeys.has(item.key)) {
          quarantine(item.key);
          followthrough.skipped.push({
            key: item.key,
            reason: "followthrough_parent_intake_quarantine",
          });
        }
      const prepared = parentRequest(seed, eligible);
      followthrough.omitted.push(...prepared.omitted);
      followthrough.semantic_input_keys = prepared.inputs.map(
        ({ item }) => item.key,
      );
      if (prepared.body)
        selection = selectParents(
          await semanticParent(parentModelRequest(prepared)),
          prepared,
        );
      else selection.status = "no_bounded_parent_input";
    } else if (semanticParent) {
      selection.status = nomination.nominated.length
        ? "insufficient_followthrough_budget"
        : "no_admitted_issues";
    }
    followthrough.status = selection.status;
    followthrough.ambiguous = selection.ambiguous;
    followthrough.judgments = selection.judgments;
    followthrough.matches = selection.matches.map(({ item, ...score }) => ({
      key: item.key,
      ...score,
    }));
    if (
      followthrough.omitted.length ||
      ![
        "semantic_candidates",
        "no_supported_parent_in_batch",
        "no_admitted_issues",
      ].includes(selection.status)
    )
      omissions.push(
        "Discovered parent coverage is bounded or unresolved; see followthrough status/omitted/judgments. No relevant-issue absence or unique identity claim.",
      );
    const parentIntake = selection.selected.map((m) => m.item);
    for (const item of parentIntake) {
      if (maxRequests - reserved - requests < 2) {
        followthrough.skipped.push({
          key: item.key,
          reason:
            "insufficient_remaining_requests_for_issue_discussion_and_timeline",
        });
        continue;
      }
      const discussion = await acquire(
        `repos/${item.repo}/issues/${item.number}/comments?per_page=100`,
        item.repo,
        "followthrough_comments",
        true,
      );
      const events = await acquire(
        `repos/${item.repo}/issues/${item.number}/timeline?per_page=100`,
        item.repo,
        "followthrough_timeline",
        true,
      );
      check(
        Array.isArray(discussion ?? []) &&
          (discussion ?? []).length <= 100 &&
          Array.isArray(events ?? []) &&
          (events ?? []).length <= 100,
        "invalid_followthrough_response",
      );
      if (!discussion || !events) {
        followthrough.skipped.push({
          key: item.key,
          reason: "followthrough_acquisition_unavailable",
        });
        continue;
      }
      const kept = await retained(
        discussion,
        "followthrough_comments",
        true,
        "comment",
      );
      const evidenceId = `D${parents.length + 1}`;
      followSources.push({
        ...evidence(evidenceId, item, `${item.title}\n${item.body}`, 3500),
        key: item.key,
        repo: item.repo,
        number: item.number,
        match_basis: "native_decisions_same_work_candidate",
        identity_verified: false,
      });
      parents.push({ item, kept, events, evidenceId });
      followthrough.expanded.push({
        key: item.key,
        source_evidence_id: evidenceId,
        revision: item.updated_at,
        comments_fetched: discussion.length,
        comments_retained: kept.length,
        timeline_events: events.length,
        snapshot:
          "Parent issue is the admitted API observation; discussion/timeline are later non-atomic reads, no parent recheck.",
      });
      if (discussion.length === 100 || events.length === 100)
        omissions.push(
          `${item.key}: followthrough discussion/timeline limited to first100`,
        );
    }
    // All selected parent discussions are captured before spending on missing literal targets.
    for (const { item, kept, events, evidenceId } of parents) {
      const context = [
        { ...item, text: `${item.title}\n${item.body}` },
        ...kept.map((c) => ({
          url: c.html_url ?? `${item.url}#issuecomment-${c.id}`,
          text: String(c.body ?? ""),
        })),
      ];
      await expandSources(item, context, events, 2, evidenceId);
    }
    if (selection.status === "ambiguous_many_matches")
      followthrough.skipped.push(
        ...selection.matches.map(({ item }) => ({
          key: item.key,
          reason: "more_than_two_plausible_parents_no_identity_assumed",
        })),
      );
    if (followthrough.skipped.length)
      omissions.push(
        "Some discovered-issue expansion skipped; see followthrough reasons. No recursive continuation or replacement query.",
      );
  }
  if (primary) {
    reserved = 0;
    const final = await acquire(
      `${endpoint}/issues/${seed.number}`,
      repo.toLowerCase(),
      "seed_recheck",
    );
    check(
      final.updated_at === primary.updated_at &&
        final.title === primary.title &&
        final.body === primary.body,
      "seed_changed_during_capture",
    );
    if (initialPr) {
      const finalPr = await acquire(
        `${endpoint}/pulls/${seed.number}`,
        repo.toLowerCase(),
        "seed_pr_recheck",
      );
      check(
        finalPr.head.sha === seed.head_sha &&
          finalPr.base.sha === seed.base_sha,
        "seed_changed_during_capture",
      );
    }
    seedRechecked = true;
  }
  const rankingIndex = buildIndex(
    [...candidates.values()].sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    ),
    "9999-12-31T23:59:59Z",
  );
  const ranked = rankingIndex.rank(
    retrieval.terms.map((row) => row.text).join(" "),
    candidates.size,
  );
  const ranks = new Map(ranked.map((row, n) => [row.key, n + 1]));
  const pool = [...candidates.values()]
    .map((item) => ({ ...item, bm25_rank: ranks.get(item.key) ?? null }))
    .sort(
      (a, b) =>
        Number(b.direct_links.length > 0) - Number(a.direct_links.length > 0) ||
        b.admission_score - a.admission_score ||
        (a.bm25_rank ?? Infinity) - (b.bm25_rank ?? Infinity) ||
        b.number - a.number ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
  const selected = pool
    .slice(0, maxCandidates)
    .map((item, n) => ({ ...item, id: `C${n + 1}`, retrieval_rank: n + 1 }));
  const catalog = sources
    .slice(0, 9)
    .map((source, n) =>
      evidence(`S${n + 1}`, source, source.text, source.limit),
    );
  catalog.push(...followSources);
  for (const item of selected)
    catalog.push({
      ...evidence(item.id, item, `${item.title}\n${item.body}`, 3500),
      key: item.key,
      repo: item.repo,
      number: item.number,
    });
  for (const item of pool)
    coverage.get(item.repo.toLowerCase()).candidate_count++;
  for (const item of selected)
    coverage.get(item.repo.toLowerCase()).selected_count++;
  const admissionSummary = admission.summary();
  for (const row of coverage.values())
    row.channels = admissionSummary.counts.get(row.repo);
  uninspected.push(...admissionSummary.dropped);
  return {
    seed,
    literal_references: literalReferences(),
    candidates: selected,
    evidence: catalog,
    scope: {
      repo,
      authorized_repositories: repositories,
      repository_coverage: [...coverage.values()],
      captured_at: capturedAt,
      cache:
        "disabled; current API reads; candidate snapshots are not an atomic repository snapshot",
      admission: {
        method: adaptive
          ? "streaming direct/generated-probe/search priority; exact source document excluded; full repository key breaks ties"
          : retrieval.method === "source-intent/1"
            ? "streaming direct/model-selected literal/search priority; full repository key breaks ties"
            : "streaming deterministic direct/concept/search priority; full repository key breaks ties",
        score: adaptive
          ? "Unicode case-insensitive substring matches of generated search atoms, not source facts; fourfold candidate-title weight. Admission score is not semantic relevance."
          : retrieval.method === "source-intent/1"
            ? "Unicode case-insensitive substring matches of source-bound model-selected fragments; fourfold candidate-title weight, unique matches per field. Admission score is not semantic relevance."
            : "Seed-local title/body terms, short technical identifiers and adjacent phrases; fourfold candidate-title weight, unique matches per field. Admission score is not semantic relevance.",
        memory:
          "At most max_discovered full candidate records; bounded read responses plus identity/channel-only audit of dropped records.",
      },
      searches,
      search_coverage: searchCoverage(),
      literal_reference_coverage: {
        max_references: 200,
        omitted_mentions: omittedLiteralMentions,
        seed_rechecked: seedRechecked,
      },
      comment_origin_filter: {
        enabled: originEnabled,
        batches: originBatches,
        AI_authorship: "unassessed",
        device_origin: "unknown",
      },
      retrieval: {
        ...retrieval,
        ...(adaptive ? { feedback } : {}),
        search_order: "GitHub best match; no updated-date preference",
        selection_order:
          "direct links, admission_score, BM25 over retained task terms, number, full key",
        semantic_judgment:
          "unchanged separate Luna/medium call; lexical matches never create a positive relationship",
        search_scope:
          "Explicit repository OR in groups of at most four repositories; existing concepts repeat across wider scopes, each with separate issue/PR queries, within the caller cumulative request cap",
      },
      followthrough,
      candidate_count: pool.length,
      inspected_count: selected.length,
      budget: {
        github_requests: requests,
        max_github_requests: maxRequests,
        max_discovered: maxDiscovered,
        max_candidates: maxCandidates,
        max_literal_fetches: 8,
        max_ranking_calls: 1,
        ...(options.selectQueries ? { max_query_selection_calls: 1 } : {}),
        max_classification_calls: 4,
        max_parent_selection_calls: semanticParent ? 1 : 0,
      },
      unjudged: pool
        .slice(maxCandidates)
        .map(({ key, repo, number, url, kind, title }) => ({
          key,
          repo,
          number,
          url,
          kind,
          title,
          relation: "unjudged",
        })),
      uninspected_references: uninspected,
      reference_parsing: referenceParsing,
      omissions: [...new Set(omissions)],
      failures,
      boundaries: [
        "caller-authorized repository set only; seed repository is the default",
        "title/body and seed comments; up to2 matching discovered-issue discussions/timelines; no diffs, code, PR candidate comments or external systems",
        "all states; no older-only cutoff; one bounded discovered-issue hop only; no expansion of newly reached items",
        "bounded search cannot establish absence",
      ],
    },
  };
}
