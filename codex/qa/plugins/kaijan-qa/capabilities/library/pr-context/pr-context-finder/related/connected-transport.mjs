import { DEFAULT_BUDGETS, MAX_TIMER_MS, positiveBudget } from "./budgets.mjs";
/** Optional request-driven source transport. No GitHub client, token or fallback. */
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { URL } from "node:url";
import { setTimeout, clearTimeout } from "node:timers";
import { check, hash, RelatedError, repositoryScope } from "./records.mjs";
import { sourceScreen } from "./source-screen.mjs";
import { ConfirmedGithubNotFound } from "./github-response.mjs";
import { sourceAdmissionReason } from "./source-page-api.mjs";

export const PROTOCOL = "pcf-github-get/3";
export const PARTIAL_PROTOCOL = "pcf-github-get/4";

/** Caller-declared lineage is validated; missing original bytes are not invented. */
export function subsetProvenance(value, body, endpoint, unavailable = false) {
  const keys = [
    "schema",
    "operation",
    "original_sha256",
    "safe_subset_sha256",
    "original_bytes",
    "safe_subset_bytes",
    "coverage",
    "total_records",
    "admitted_records",
    "omitted_records",
    "omissions",
  ];
  check(
    value &&
      Object.keys(value).sort().join() === keys.sort().join() &&
      /^repos\/[\w.-]+\/[\w.-]+\/issues\?/.test(endpoint) &&
      value.schema === "pcf-safe-subset/1" &&
      value.operation === "whole-issue-record-quarantine" &&
      value.coverage === "partial" &&
      [value.original_bytes, value.safe_subset_bytes].every(
        (x) => Number.isInteger(x) && x > 0,
      ) &&
      [value.original_sha256, value.safe_subset_sha256].every(
        (x) => typeof x === "string" && /^[0-9a-f]{64}$/.test(x),
      ) &&
      [
        value.total_records,
        value.admitted_records,
        value.omitted_records,
      ].every((x) => Number.isInteger(x) && x >= 0) &&
      value.omitted_records > 0 &&
      value.total_records === value.admitted_records + value.omitted_records &&
      Array.isArray(value.omissions) &&
      value.omissions.length === value.omitted_records &&
      value.omissions.every(
        (x) =>
          x &&
          Object.keys(x).sort().join() === "reason,record_sha256" &&
          x.reason === "source_privacy" &&
          /^[0-9a-f]{64}$/.test(x.record_sha256),
      ),
    "connected_invalid_subset_provenance",
  );
  if (unavailable) {
    check(
      value.admitted_records === 0 &&
        body === null &&
        value.safe_subset_sha256 === hash("[]\n") &&
        value.safe_subset_bytes === 3,
      "connected_invalid_subset_provenance",
    );
  } else {
    check(
      typeof body === "string" &&
        hash(body) === value.safe_subset_sha256 &&
        Buffer.byteLength(body) === value.safe_subset_bytes &&
        value.admitted_records > 0,
      "connected_invalid_subset_provenance",
    );
    const data = JSON.parse(body);
    check(
      Array.isArray(data) && data.length === value.admitted_records,
      "connected_invalid_subset_provenance",
    );
  }
  return value;
}

/** Admit only collector issue/PR/search GETs, without changing their bytes/order. */
export function requestUrl(endpoint, repositories) {
  check(
    typeof endpoint === "string" &&
      !/[\s#\\]/.test(endpoint) &&
      !endpoint.startsWith("/"),
    "connected_scope_refused",
  );
  const url = new URL(`https://api.github.com/${endpoint}`);
  check(
    url.origin === "https://api.github.com" && !url.username && !url.password,
    "connected_scope_refused",
  );
  const allowed = new Set(repositories);
  const p = url.pathname;
  const item =
    /^\/repos\/([\w.-]+\/[\w.-]+)\/(issues|pulls)(?:\/([1-9]\d*)(?:\/(comments|timeline))?)?$/.exec(
      p,
    );
  if (item) {
    check(
      allowed.has(item[1].toLowerCase()) &&
        (item[2] === "issues" || (item[3] && !item[4])),
      "connected_scope_refused",
    );
  } else {
    check(p === "/search/issues", "connected_scope_refused");
    // Bind repository authority to the collector's scoped query structure,
    // not to an English/ASCII concept vocabulary. Quoted term content is data.
    check(url.searchParams.getAll("q").length === 1, "connected_scope_refused");
    const q = url.searchParams.get("q");
    const scoped =
      /^\((repo:[\w.-]+\/[\w.-]+(?: OR repo:[\w.-]+\/[\w.-]+)*)\) in:title,body \("(?:\\.|[^"\\])*"(?: (?:OR|AND) "(?:\\.|[^"\\])*")*\) is:(?:issue|pull-request)$/u.exec(
        q,
      );
    check(scoped, "connected_scope_refused");
    const repos = [...scoped[1].matchAll(/\brepo:([\w.-]+\/[\w.-]+)/g)];
    check(
      repos.every((r) => allowed.has(r[1].toLowerCase())),
      "connected_scope_refused",
    );
  }
  // Query key/value interpretation belongs to GitHub. Alternate sort/page/filter
  // options do not widen repository authority; response/request budgets remain.
  // Reject normalization/path traversal and encoded paths, not query escaping.
  check(
    url.href === `https://api.github.com/${endpoint}` && !p.includes("%"),
    "connected_scope_refused",
  );
  return url.href;
}

/** fulfill(request,{signal}) must return one original, matched response envelope. */
export function connectedReader({
  signal,
  calls,
  preserve,
  repositories,
  maxRequests = DEFAULT_BUDGETS.maxRequests,
  timeoutMs = 90000,
  deadlineAt = null,
  fulfill,
  sourcePrivacy = "strict",
  screen = sourceScreen(process.env, signal),
}) {
  const scope = repositoryScope(repositories[0], repositories);
  check(
    signal &&
      Array.isArray(calls) &&
      typeof preserve === "function" &&
      typeof fulfill === "function" &&
      ["strict", "quarantine-records"].includes(sourcePrivacy) &&
      positiveBudget(maxRequests) &&
      positiveBudget(timeoutMs) &&
      timeoutMs <= MAX_TIMER_MS &&
      (deadlineAt === null || Number.isFinite(deadlineAt)),
    "invalid_connected_transport",
  );
  const runId = randomUUID();
  let terminal = false,
    busy = false,
    sequence = 0;
  const persist = (name, value) => {
    try {
      preserve(name, value);
    } catch {
      terminal = true;
      throw new RelatedError("github_receipt_storage_failed");
    }
  };
  return async (endpoint) => {
    check(!terminal && !busy, "github_unavailable");
    signal.throwIfAborted();
    check(sequence < maxRequests, "github_request_limit");
    const url = requestUrl(endpoint, scope);
    busy = true;
    try {
      await screen(url);
    } catch (error) {
      terminal = true;
      busy = false;
      throw error;
    }
    const waitMs = Math.min(timeoutMs, (deadlineAt ?? Infinity) - Date.now());
    check(waitMs > 0, "stopped");
    const number = ++sequence;
    const request = {
      protocol: sourcePrivacy === "strict" ? PROTOCOL : PARTIAL_PROTOCOL,
      ...(sourcePrivacy === "strict" ? {} : { source_privacy: sourcePrivacy }),
      type: "github_get",
      run_id: runId,
      id: `${runId}:${number}`,
      method: "GET",
      url,
      endpoint,
      deadline_at: new Date(Date.now() + waitMs).toISOString(),
    };
    const call = {
      endpoint,
      transport: "connected",
      request_id: request.id,
      started_at: new Date().toISOString(),
      status: "dispatch_intent",
      http_status: null,
      headers: null,
      body_complete: null,
      unknown_effects: true,
    };
    persist(`github-intent-${number}.json`, request);
    calls.push(call);
    busy = true;
    const start = performance.now();
    const deadline = new globalThis.AbortController();
    const timer = setTimeout(() => deadline.abort(), waitMs);
    const combined = globalThis.AbortSignal.any([signal, deadline.signal]);
    let raw = null,
      onAbort;
    try {
      combined.throwIfAborted();
      const aborted = new Promise((_, reject) => {
        onAbort = () => reject(new RelatedError("connected_wait_aborted"));
        combined.addEventListener("abort", onAbort, { once: true });
      });
      const response = await Promise.race([
        Promise.resolve().then(() => {
          combined.throwIfAborted();
          return fulfill(request, { signal: combined });
        }),
        aborted,
      ]);
      combined.throwIfAborted();
      if (typeof response?.body === "string") {
        call.stdout_bytes = Buffer.byteLength(response.body);
        call.stdout_sha256 = hash(response.body);
      }
      await screen(response);
      if (typeof response?.body === "string") {
        check(response.body.isWellFormed(), "connected_invalid_payload");
        persist(
          `github-observed-body-${number}.bin`,
          Buffer.from(response.body),
        );
        let decoded;
        try {
          decoded = JSON.parse(response.body);
        } catch {
          /* Shape checks below retain the failure. */
        }
        if (decoded !== undefined) await screen(decoded);
      }
      check(
        response &&
          Object.keys(response).every((k) =>
            [
              "protocol",
              "run_id",
              "id",
              "url",
              "outcome",
              "http_status",
              "body_complete",
              "headers",
              "body",
              ...(sourcePrivacy === "strict" ? [] : ["source_provenance"]),
            ].includes(k),
          ) &&
          response.protocol === request.protocol &&
          response.run_id === runId &&
          response.id === request.id &&
          response.url === request.url,
        "connected_response_mismatch",
      );
      check(
        [
          "response",
          "unavailable",
          ...(sourcePrivacy === "strict" ? [] : ["derived_response"]),
        ].includes(response.outcome) &&
          (response.http_status === null ||
            (Number.isInteger(response.http_status) &&
              response.http_status >= 100 &&
              response.http_status <= 599)) &&
          [true, false, null].includes(response.body_complete),
        "connected_invalid_envelope",
      );
      const derived = response.outcome === "derived_response";
      if (derived || Object.hasOwn(response, "source_provenance")) {
        check(
          sourcePrivacy === "quarantine-records" &&
            (derived || response.outcome === "unavailable"),
          "connected_invalid_subset_provenance",
        );
        call.source_provenance = subsetProvenance(
          response.source_provenance,
          response.body,
          endpoint,
          !derived,
        );
        persist(
          `github-source-provenance-${number}.json`,
          call.source_provenance,
        );
      }
      const headers = response.headers;
      check(
        headers === null ||
          (headers &&
            typeof headers === "object" &&
            !Array.isArray(headers) &&
            Object.entries(headers).every(
              ([k, v]) =>
                [
                  "link",
                  "retry-after",
                  "x-ratelimit-remaining",
                  "x-ratelimit-reset",
                ].includes(k) &&
                typeof v === "string" &&
                !/[\r\n]/.test(v),
            )),
        "connected_invalid_headers",
      );
      Object.assign(call, {
        http_status: response.http_status,
        headers,
        body_complete: response.body_complete,
        outcome: response.outcome,
        provenance:
          "caller-fulfilled collector request; payload visibility only unless separately supplied",
        unknown_effects: response.outcome === "unavailable",
      });
      if (typeof response.body === "string") {
        const bytes = Buffer.byteLength(response.body);
        call.stdout_bytes = bytes;
        call.stdout_sha256 = hash(response.body);
        raw = Buffer.from(response.body);
        persist(
          derived
            ? `github-safe-subset-${number}.json`
            : `github-raw-${number}.json`,
          raw,
        );
      }
      if (
        response.http_status !== null &&
        (response.http_status < 200 || response.http_status >= 300)
      ) {
        call.failure =
          response.http_status === 404
            ? "not_found"
            : response.http_status === 403
              ? headers?.["x-ratelimit-remaining"] === "0"
                ? "rate_limited"
                : "forbidden"
              : response.http_status === 429
                ? "rate_limited"
                : "http_error";
        if (
          response.http_status === 404 &&
          response.outcome === "response" &&
          response.body_complete === true &&
          raw !== null
        ) {
          const errorBody = JSON.parse(raw.toString("utf8"));
          check(
            errorBody !== null &&
              typeof errorBody === "object" &&
              !Array.isArray(errorBody),
            "connected_invalid_payload",
          );
          throw new ConfirmedGithubNotFound();
        }
        throw new RelatedError("connected_http_error");
      }
      if (response.outcome === "unavailable")
        throw new RelatedError("connected_fulfillment_unavailable");
      check(
        raw !== null && response.body_complete !== false,
        "connected_incomplete_response",
      );
      const data = JSON.parse(raw.toString("utf8"));
      check(
        data !== null && typeof data === "object",
        "connected_invalid_payload",
      );
      call.status = "received";
      call.visibility = derived
        ? "derived_safe_subset"
        : response.http_status === null || response.body_complete === null
          ? "partial_metadata"
          : "reported_http_metadata";
      return data;
    } catch (error) {
      terminal = !(error instanceof ConfirmedGithubNotFound);
      call.status = signal.aborted ? "stopped" : "failed";
      call.failure ??= deadline.signal.aborted
        ? "timeout_unknown_effects"
        : error.code && /^connected_[a-z_]+$/.test(error.code)
          ? error.code
          : (sourceAdmissionReason(error) ?? "malformed_or_failed_fulfillment");
      call.late_response_admission = false;
      if (!signal.aborted && error instanceof ConfirmedGithubNotFound)
        throw error;
      throw new RelatedError(signal.aborted ? "stopped" : "github_unavailable");
    } finally {
      busy = false;
      clearTimeout(timer);
      if (onAbort) combined.removeEventListener("abort", onAbort);
      call.elapsed_ms = Math.round(performance.now() - start);
      // No invented HTTP200, stderr, child exit, or physical connector call count.
      persist(`github-receipt-${number}.json`, call);
    }
  };
}
