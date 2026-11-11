import { fromMarkdown } from "./markdown/parser.mjs";
import { createHash } from "node:crypto";

export const REFERENCE_CONTRACT = "github-reference-identity/1";
const slug = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const sha = (text) => createHash("sha256").update(text).digest("hex");
function targetFor(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { target: null, reason: "relative_or_invalid_destination" };
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search
  )
    return { target: null, reason: "unsupported_destination" };
  const m = /^\/([^/]+\/[^/]+)\/(issues|pull)\/([1-9]\d*)\/?$/.exec(
    parsed.pathname,
  );
  if (!m || !slug.test(m[1]) || !Number.isSafeInteger(Number(m[3])))
    return { target: null, reason: "unsupported_github_route" };
  return {
    target: {
      repo: m[1],
      kind: m[2] === "pull" ? "pr" : "issue",
      number: Number(m[3]),
      url: `https://github.com/${m[1]}/${m[2]}/${m[3]}`,
    },
    reason: null,
  };
}

/** CommonMark link destinations are identity; child labels never grant another scope. */
export function scanReferences(text, repo) {
  if (typeof text !== "string" || !slug.test(repo))
    throw new Error("invalid_reference_source");
  const tree = fromMarkdown(text),
    definitions = new Map(),
    mentions = [];
  function collect(node) {
    if (node.type === "definition" && !definitions.has(node.identifier))
      definitions.set(node.identifier, node);
    for (const child of node.children ?? []) collect(child);
  }
  collect(tree);
  const position = (node) => ({
    start: node.position.start.offset,
    end: node.position.end.offset,
    unit: "utf16",
  });
  function emit(start, end, syntax, url, extra = {}) {
    const resolved = targetFor(url);
    mentions.push({
      syntax,
      position: { start, end, unit: "utf16" },
      literal: text.slice(start, end),
      destination: url,
      ...resolved,
      ...extra,
    });
  }
  function plain(node) {
    const start = node.position.start.offset,
      end = node.position.end.offset,
      raw = text.slice(start, end);
    const masked = raw.split("");
    for (const match of raw.matchAll(/https?:\/\/[^\s<>\])]+/gi)) {
      const value = match[0].replace(/[.,:;!'"`”’]+$/, "");
      emit(
        start + match.index,
        start + match.index + value.length,
        "literal_url",
        value,
      );
      masked.fill(" ", match.index, match.index + match[0].length);
    }
    for (const match of masked
      .join("")
      .matchAll(
        /(?<![\w/.-])(?:([A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*)|([A-Za-z0-9][A-Za-z0-9_.-]*))?#([1-9]\d*)\b/g,
      )) {
      const index = match.index,
        number = Number(match[3]);
      if (!Number.isSafeInteger(number)) continue;
      let backslashes = 0;
      for (let n = index - 1; n >= 0 && raw[n] === "\\"; n--) backslashes++;
      const reason =
        backslashes % 2
          ? "escaped_reference"
          : match[2]
            ? "insufficient_repository_qualification"
            : null;
      mentions.push({
        syntax: match[1] ? "qualified_reference" : "bare_reference",
        position: {
          start: start + index,
          end: start + index + match[0].length,
          unit: "utf16",
        },
        literal: text.slice(start + index, start + index + match[0].length),
        destination: null,
        target: reason
          ? null
          : { repo: match[1] ?? repo, number, kind: "unknown", url: null },
        reason,
      });
    }
  }
  function visit(node) {
    if (["link", "image", "definition"].includes(node.type)) {
      const p = position(node);
      emit(p.start, p.end, node.type, node.url);
      return;
    }
    if (["linkReference", "imageReference"].includes(node.type)) {
      const p = position(node),
        definition = definitions.get(node.identifier);
      if (definition)
        emit(p.start, p.end, node.type, definition.url, {
          definition_position: position(definition),
          definition_literal: text.slice(
            definition.position.start.offset,
            definition.position.end.offset,
          ),
        });
      else
        mentions.push({
          syntax: node.type,
          position: p,
          literal: text.slice(p.start, p.end),
          destination: null,
          target: null,
          reason: "unresolved_reference_definition",
        });
      return;
    }
    if (node.type === "html") {
      const p = position(node);
      mentions.push({
        syntax: "html",
        position: p,
        literal: text.slice(p.start, p.end),
        destination: null,
        target: null,
        reason: "html_not_parsed",
      });
      return;
    }
    if (!node.children && node.position) plain(node);
    else for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  mentions.sort((a, b) => a.position.start - b.position.start);
  const boundaries = new Set(
      mentions.flatMap((m) => [m.position.start, m.position.end]),
    ),
    cp = new Map();
  let offset = 0,
    count = 0;
  for (const value of text) {
    if (boundaries.has(offset)) cp.set(offset, count);
    offset += value.length;
    count++;
  }
  cp.set(offset, count);
  for (const m of mentions)
    m.codepoint_position = {
      start: cp.get(m.position.start),
      end: cp.get(m.position.end),
      unit: "unicode_codepoint",
    };
  return {
    schema: REFERENCE_CONTRACT,
    source_sha256: sha(text),
    source_units: text.length,
    mentions,
    coverage:
      "CommonMark AST links/definitions; literal GitHub URLs, owner/repo#N and bare #N in non-link source. Undefined CommonMark references are literal text; raw HTML is uninspected. Literal mentions are not relationship assertions.",
  };
}

export function identitiesForScan(scan, includeRoutes = false) {
  const found = new Map();
  for (const mention of [...scan.mentions].sort(
    (a, b) => Number(!a.target?.url) - Number(!b.target?.url),
  )) {
    const target = mention.target;
    if (!target) continue;
    const key = target.repo.toLowerCase() + "#" + target.number;
    const previous = found.get(key);
    found.set(key, {
      repo: target.repo,
      number: target.number,
      ...(includeRoutes && (target.url ?? previous?.url)
        ? { url: target.url ?? previous.url }
        : {}),
    });
  }
  return [...found.values()];
}
export const referenceIdentities = (text, repo, includeRoutes = false) =>
  identitiesForScan(scanReferences(text, repo), includeRoutes);
