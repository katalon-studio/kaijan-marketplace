import { readFileSync } from "node:fs";
import { ValueError } from "./errors.mjs";
import { WORD_CLASS, normalizeNfkc } from "./unicode_properties.mjs";
import {
  encoded,
  digest,
  parseJson,
  isObject,
  positiveInteger,
  isInteger,
  utf8,
} from "./json_bytes.mjs";
export { encoded, digest } from "./json_bytes.mjs";

export const VERSION = "3.0.0";
export const MODULE_SHA256 = digest(readFileSync(new URL(import.meta.url)));
const folds = new Map();
for (const line of readFileSync(
  new URL("./data/CaseFolding-15.0.0.txt", import.meta.url),
  "utf8",
).split("\n")) {
  const parts = line
    .split("#")[0]
    .split(";")
    .map((x) => x.trim());
  if (["C", "F"].includes(parts[1]))
    folds.set(
      Number.parseInt(parts[0], 16),
      String.fromCodePoint(
        ...parts[2].split(" ").map((x) => Number.parseInt(x, 16)),
      ),
    );
}
export const casefold = (value) =>
  [...value].map((c) => folds.get(c.codePointAt(0)) ?? c).join("");
export const strip = (value) =>
  value.replace(
    // eslint-disable-next-line no-control-regex -- Preserve Python str.strip's control separators.
    /^[\p{White_Space}\x1c-\x1f]+|[\p{White_Space}\x1c-\x1f]+$/gu,
    "",
  );
export const truthy = (value) =>
  value !== null &&
  value !== undefined &&
  value !== false &&
  value !== 0 &&
  value !== 0n &&
  value !== "" &&
  (!(value instanceof Number) || Number(value) !== 0) &&
  (!Array.isArray(value) || value.length > 0) &&
  (!isObject(value) || Object.keys(value).length > 0);
const authorOf = (record) =>
  [record.user, record.author, record.actor].find(truthy) ?? {};
export function policyValues(policy = null) {
  const provided = policy !== null && policy !== undefined;
  const data =
    Buffer.isBuffer(policy) || policy instanceof Uint8Array
      ? Buffer.from(policy)
      : encoded(provided ? policy : { exclude_actors: [] });
  const value = parseJson(data);
  if (!isObject(value) || !Array.isArray(value.exclude_actors))
    throw new ValueError("invalid_authored_policy");
  const logins = new Set(),
    ids = new Set();
  for (const actor of value.exclude_actors) {
    if (
      !isObject(actor) ||
      !["login", "id"].some((k) => Object.hasOwn(actor, k))
    )
      throw new ValueError("invalid_authored_policy");
    if (Object.hasOwn(actor, "login")) {
      if (typeof actor.login !== "string" || !strip(actor.login))
        throw new ValueError("invalid_authored_policy");
      logins.add(casefold(strip(actor.login)));
    }
    if (Object.hasOwn(actor, "id")) {
      if (!positiveInteger(actor.id))
        throw new ValueError("invalid_authored_policy");
      ids.add(String(actor.id));
    }
  }
  return { logins, ids, policyHash: digest(data), provided };
}
export function commentOrigin(record, { enabled = true } = {}) {
  if (!isObject(record) || typeof enabled !== "boolean")
    throw new ValueError("invalid_comment_origin");
  const selected = authorOf(record),
    author = isObject(selected) ? selected : {};
  const app = record.performed_via_github_app;
  const identified = isObject(app) && positiveInteger(app.id);
  const reasons = [];
  if (author.type === "Bot") reasons.push("github_bot_actor");
  if (identified) reasons.push("github_app_attribution");
  return {
    schema: "loki.github-comment-origin/1",
    enabled,
    exclude: enabled && reasons.length > 0,
    reasons,
    actor_type: typeof author.type === "string" ? author.type : null,
    app_attribution: identified
      ? "identified"
      : Object.hasOwn(record, "performed_via_github_app")
        ? app === null
          ? "explicit_null"
          : "invalid_metadata"
        : "not_supplied",
    status: reasons.length
      ? "identified_bot_or_app"
      : author.type === "User"
        ? "user_account_origin_unverified"
        : "unknown",
    app_attribution_unknown: !identified,
    device_origin: "unknown",
    AI_authorship: "unassessed",
  };
}
export function originSetting(policy = null, enabled = null) {
  if (enabled === null || enabled === undefined) {
    const value =
      Buffer.isBuffer(policy) || policy instanceof Uint8Array
        ? parseJson(policy)
        : truthy(policy)
          ? policy
          : {};
    if (!isObject(value))
      throw new ValueError("invalid_comment_origin_setting");
    enabled = Object.hasOwn(value, "comment_origin_filter")
      ? value.comment_origin_filter
      : true;
  }
  if (typeof enabled !== "boolean")
    throw new ValueError("invalid_comment_origin_setting");
  return enabled;
}
export function authoredEligibility(
  record,
  policy = null,
  { mode = "actor-only", role = "evidence", commentOriginFilter = null } = {},
) {
  if (
    !isObject(record) ||
    mode !== "actor-only" ||
    !["subject", "evidence", "comment", "code"].includes(role)
  )
    throw new ValueError("invalid_authored_condition");
  const { logins, ids, policyHash, provided } = policyValues(policy);
  let author = authorOf(record);
  if (!isObject(author))
    author = typeof author === "string" ? { login: author } : {};
  const login = author.login,
    ident = author.id;
  const unknown = !(
    (typeof login === "string" && strip(login)) ||
    positiveInteger(ident)
  );
  const matched =
    (typeof login === "string" && logins.has(casefold(login))) ||
    (isInteger(ident) && ids.has(String(ident)));
  let reason =
    role === "code"
      ? "code_changes_unfiltered"
      : matched
        ? "configured_actor"
        : "actor_unmatched_unverified";
  let excluded = role !== "code" && matched;
  const origin =
    role === "comment"
      ? commentOrigin(record, {
          enabled: originSetting(policy, commentOriginFilter),
        })
      : null;
  if (origin?.exclude) {
    excluded = true;
    if (!matched) reason = origin.reasons[0];
  }
  return {
    schema: "loki.authored-record-eligibility/1",
    version: VERSION,
    mode,
    role,
    decision: excluded ? "quarantine" : "retain",
    reason,
    policy_sha256: policyHash,
    module_sha256: MODULE_SHA256,
    original_record_sha256: digest(encoded(record)),
    policy_provided: provided,
    policy_configured: logins.size + ids.size > 0,
    unknown_author: unknown,
    comment_origin: origin,
    content_provenance: [],
    authorship_proven: false,
    coverage: "supplied_record_mechanical_only",
  };
}

// These are retained optional lexical observations, never admission predicates.
const generationFooter =
  /^(?:🤖\s*)?(?:This (?:PR|pull request|issue|comment|record|content|text|description) (?:was |is )?)?(?:AI[-‐‑–— ]generated|Generated\s*(?:with|by)\s*(?:\[(?:Claude(?:\s*Code)?|ChatGPT|Codex|GitHub Copilot|Copilot|AI)\]\(https?:\/\/[^)]+\)|Claude(?:\s*Code)?|ChatGPT|Codex|GitHub Copilot|Copilot|(?:an?\s+)?AI(?:\s+assistant)?))\.?(?:\s*(?:[—–:.-]\s*)?(?:Please\s+)?verify before (?:acting|use)\.?)?(?:\s+\[[^\]\r\n]+\]\(https?:\/\/[^)\r\n]+\))?$/iu;
const genericFooter =
  /^(?:🤖\s*)?(?:(?:[\p{L}\p{N}_][\p{L}\p{N}_ .:-]{0,100}?)\s+-\s+)?AI[- ]generated (?:improvement|change|update|contribution|description|content) on behalf of @[\p{L}\p{N}_.-]+\.?$/iu;
const automationDeclaration =
  /(?:^|(?<=[.!?])\s+)(?:This (?:PR|pull request|issue|comment|record|content|text|description) (?:was |is )?)?(?:(?:automatically|programmatically) (?:created|generated)|(?:created|generated) (?:automatically|programmatically)|(?:Created|Generated) by (?<producer>[\p{L}\p{N}_][\p{L}\p{N}_ .:-]{0,120}))\.?$/iu;
const automationProducer =
  /(?<![\p{L}\p{N}_])(?:automation|automated|workflow|bot|ci|[\p{L}\p{N}_-]*sync[\p{L}\p{N}_-]*)(?![\p{L}\p{N}_])/iu;
const pythonPattern = (pattern) =>
  new RegExp(
    pattern.source
      .replace(/[iI]/g, "[iIİı]")
      // Python's Unicode word membership is independent of IGNORECASE. Keep
      // Node's newer case tables from admitting characters unassigned in 15.0.
      .replace(
        /\[\\p\{L\}\\p\{N\}_([^\]]*)\]/g,
        (_, extra) => `(?-i:[${WORD_CLASS}${extra}])`,
      )
      .replace(/\\s/g, "[\\p{White_Space}\\x1c-\\x1f]"),
    "iu",
  );
const [generationPattern, genericPattern, declarationPattern, producerPattern] =
  [
    generationFooter,
    genericFooter,
    automationDeclaration,
    automationProducer,
  ].map(pythonPattern);
export function analysisLine(value) {
  return strip(
    normalizeNfkc(value)
      .replace(/[‐‑–—]/gu, "-")
      .replace(/\*\*([^*\r\n]+)\*\*|__([^_\r\n]+)__/gu, (_, a, b) => a ?? b),
  );
}
export function generationProvenance(record) {
  const found = [];
  for (const property of ["title", "body", "text"]) {
    const value = record[property];
    if (typeof value !== "string") continue;
    let offset = 0,
      fence = null;
    for (const line of value
      // eslint-disable-next-line no-control-regex -- Preserve Python splitlines boundaries and codepoint spans.
      .match(/.*?(?:\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]|$)/gsu)
      .filter(Boolean)) {
      const stripped = strip(line),
        marker = /^(?<marker>`{3,}|~{3,})/u.exec(stripped);
      if (marker) fence = fence === marker[0][0] ? null : marker[0][0];
      let quoted = stripped.startsWith(">") || fence !== null;
      let declaration = strip(stripped.replace(/^[> ]+/u, ""));
      if (
        declaration.length > 1 &&
        ['"', "'", "`"].includes(declaration[0]) &&
        declaration.at(-1) === declaration[0]
      ) {
        quoted = true;
        declaration = strip(declaration.slice(1, -1));
      }
      if (declaration.startsWith("**") && declaration.endsWith("**"))
        declaration = strip(declaration.slice(2, -2));
      let automated = declarationPattern.exec(declaration);
      if (
        automated?.groups?.producer &&
        !producerPattern.test(automated.groups.producer)
      )
        automated = null;
      const analyzed = analysisLine(declaration);
      if (
        generationPattern.test(analyzed) ||
        genericPattern.test(analyzed) ||
        automated
      )
        found.push({
          property,
          span_start_codepoints: offset,
          span_end_codepoints: offset + [...line].length,
          content_sha256: digest(utf8(value)),
          declaration_sha256: digest(utf8(line)),
          classification: quoted
            ? "uncertain"
            : automated
              ? "explicit_automated"
              : "explicit_generated",
          declaration_kind: automated ? "automated_creation" : "AI_generation",
        });
      offset += [...line].length;
    }
  }
  return found;
}
export {
  authoredEligibility as authored_eligibility,
  commentOrigin as comment_origin,
  originSetting as origin_setting,
  policyValues as policy_values,
  generationProvenance as generation_provenance,
};
