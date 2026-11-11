import { createHash } from "node:crypto";
import { sanitize } from "./source-sanitizer-api.mjs";
import { urlsplit } from "./urlsplit.mjs";
import { parseUrl as githubIdentity } from "../../github-capture/github_identity.mjs";
import { parseStrict, encodedJson, isJsonInteger, utf8 } from "./json.mjs";
const MODES = {
  strict: ["pcf-github-get/1", "pcf-github-get/3"],
  "quarantine-records": ["pcf-github-get/2", "pcf-github-get/4"],
};
const need = (condition, code) => {
  if (!condition) throw Object.assign(Error(code), { code });
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const wire = (value) =>
  utf8(encodedJson(value, { compact: true, allowNan: false }) + "\n");
const safe = (value, secrets) => sanitize(value, { secrets })[1].length === 0;
// Fixed diagnostics only: never relay an exception's source-bearing message.
const admissionReasons = new Set([
  "source_invalid_control",
  "source_mode_protocol_mismatch",
  "source_URL",
  "source_tool_wrapper",
  "source_wrapper_privacy",
  "source_UTF8",
  "source_body_limit",
  "source_shape",
  "source_nested_wrapper",
  "source_error_payload",
  "source_issue_page_shape",
  "source_frame_limit",
  "source_privacy",
  "source_duplicate_key",
  "source_invalid_constant",
  "source_invalid_JSON",
  "source_secret_binding_unavailable",
]);
export function sourceAdmissionReason(error) {
  const reason = error?.code ?? error?.message;
  return admissionReasons.has(reason) ? reason : null;
}
function sameIssueIdentity(record, repo) {
  try {
    const identity = githubIdentity(record.html_url);
    return (
      identity.repo.toLowerCase() === repo.toLowerCase() &&
      identity.kind ===
        (Object.hasOwn(record, "pull_request") ? "pr" : "issue") &&
      identity.number === record.number &&
      // Retain the source-page wire contract: only repository case may vary.
      identity.url ===
        `https://github.com/${identity.repo}/${identity.kind === "pr" ? "pull" : "issues"}/${record.number}`
    );
  } catch {
    return false;
  }
}
function exactValues(value) {
  if (typeof value === "bigint") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.isWellFormed();
  if (Array.isArray(value)) return value.every(exactValues);
  if (value && typeof value === "object")
    return Object.entries(value).every(
      ([k, v]) => exactValues(k) && exactValues(v),
    );
  return value === null || typeof value === "boolean";
}
function typedIssue(r, repo) {
  return (
    r &&
    !Array.isArray(r) &&
    typeof r === "object" &&
    exactValues(r) &&
    Number.isSafeInteger(r.id) &&
    isJsonInteger(r, "id") &&
    r.id > 0 &&
    Number.isSafeInteger(r.number) &&
    isJsonInteger(r, "number") &&
    r.number > 0 &&
    typeof r.title === "string" &&
    Object.hasOwn(r, "body") &&
    (r.body === null || typeof r.body === "string") &&
    ["open", "closed"].includes(r.state) &&
    typeof r.updated_at === "string" &&
    r.updated_at &&
    sameIssueIdentity(r, repo) &&
    !["error", "errors", "message"].some((k) => Object.hasOwn(r, k))
  );
}
export function admitSource(
  request,
  receipt,
  mode = "strict",
  { secrets = [] } = {},
) {
  if (mode !== null && typeof mode === "object")
    throw Error("source_invalid_control");
  need(Object.hasOwn(MODES, mode), "source_mode_protocol_mismatch");
  if (!request || typeof request !== "object" || Array.isArray(request))
    throw Error("source_invalid_control");
  need(
    MODES[mode].includes(request.protocol) &&
      (mode !== "quarantine-records" || request.source_privacy === mode),
    "source_mode_protocol_mismatch",
  );
  need(typeof request.url === "string", "source_URL");
  need(!/^[\0-\x20]/.test(request.url.replace(/[\t\r\n]/g, "")), "source_URL");
  const parsed = urlsplit(request.url);
  need(
    parsed.scheme === "https" &&
      parsed.netloc === "api.github.com" &&
      !parsed.fragment &&
      !parsed.path.includes("%") &&
      !parsed.path.split("/").includes(".."),
    "source_URL",
  );
  const rawPath = parsed.path;
  need(
    receipt &&
      typeof receipt === "object" &&
      typeof receipt.isError === "boolean",
    "source_tool_wrapper",
  );
  if (
    ["protocol", "run_id", "id", "url"].some(
      (key) => !Object.hasOwn(request, key),
    )
  )
    throw Error("source_invalid_control");
  const envelope = Object.fromEntries(
    ["protocol", "run_id", "id", "url"].map((k) => [k, request[k]]),
  );
  Object.assign(envelope, {
    outcome: "response",
    http_status: null,
    headers: null,
    body_complete: null,
    body: null,
  });
  if (receipt.isError) {
    need(safe(receipt, secrets), "source_wrapper_privacy");
    const supplied = Object.hasOwn(receipt, "content") ? receipt.content : [];
    const items =
      Array.isArray(supplied) || typeof supplied === "string"
        ? supplied
        : supplied && typeof supplied === "object"
          ? Object.keys(supplied)
          : null;
    if (items === null) throw Error("source_invalid_control");
    const statuses = [];
    for (const item of items) {
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        item.type === "text"
      ) {
        const value = Object.hasOwn(item, "text") ? item.text : "";
        if (typeof value !== "string") throw Error("source_invalid_control");
        const match = /^GitHub API error ([1-5]\d\d):/.exec(value);
        if (match) statuses.push(Number(match[1]));
      }
    }
    return {
      ...envelope,
      outcome: "unavailable",
      http_status: statuses.length === 1 ? statuses[0] : null,
    };
  }
  const wrapper = receipt.structuredContent;
  need(
    wrapper &&
      typeof wrapper.content === "string" &&
      wrapper.url === request.url,
    "source_tool_wrapper",
  );
  const raw = wrapper.content;
  need(raw.isWellFormed(), "source_UTF8");
  const original = Buffer.from(raw);
  for (const key of ["max_response_bytes", "max_frame_bytes"])
    need(
      request[key] === undefined ||
        (Number.isSafeInteger(request[key]) && request[key] > 0),
      "source_invalid_control",
    );
  need(
    request.max_response_bytes === undefined ||
      original.length <= request.max_response_bytes,
    "source_body_limit",
  );
  const value = parseStrict(raw);
  need(value && typeof value === "object", "source_shape");
  const metadata = parseStrict(encodedJson(receipt));
  metadata.structuredContent.content = "[screened separately]";
  if ((wrapper.structuredContent ?? null) !== null) {
    need(wrapper.structuredContent.content === raw, "source_nested_wrapper");
    metadata.structuredContent.structuredContent.content =
      "[screened separately]";
  }
  need(safe(metadata, secrets), "source_wrapper_privacy");
  need(
    Array.isArray(value) ||
      !["error", "errors", "message"].some((k) => Object.hasOwn(value, k)),
    "source_error_payload",
  );
  const page =
    /^\/repos\/([\p{L}\p{N}_\p{Nl}.-]+\/[\p{L}\p{N}_\p{Nl}.-]+)\/issues$/u.exec(
      rawPath,
    );
  if (mode === "quarantine-records" && page) {
    need(
      Array.isArray(value) && value.every((r) => typedIssue(r, page[1])),
      "source_issue_page_shape",
    );
    const admitted = [],
      omitted = [];
    for (const item of value)
      safe(item, secrets)
        ? admitted.push(item)
        : omitted.push({
            record_sha256: digest(wire(item)),
            reason: "source_privacy",
          });
    if (omitted.length) {
      const subset = wire(admitted);
      envelope.source_provenance = {
        schema: "pcf-safe-subset/1",
        operation: "whole-issue-record-quarantine",
        original_sha256: digest(original),
        safe_subset_sha256: digest(subset),
        original_bytes: original.length,
        safe_subset_bytes: subset.length,
        coverage: "partial",
        total_records: value.length,
        admitted_records: admitted.length,
        omitted_records: omitted.length,
        omissions: omitted,
      };
      Object.assign(envelope, {
        outcome: admitted.length ? "derived_response" : "unavailable",
        body: admitted.length ? subset.toString() : null,
      });
      need(
        request.max_frame_bytes === undefined ||
          wire(envelope).length <= request.max_frame_bytes,
        "source_frame_limit",
      );
      return envelope;
    }
  }
  need(safe(value, secrets), "source_privacy");
  envelope.body = raw;
  need(
    request.max_frame_bytes === undefined ||
      wire(envelope).length <= request.max_frame_bytes,
    "source_frame_limit",
  );
  return envelope;
}
