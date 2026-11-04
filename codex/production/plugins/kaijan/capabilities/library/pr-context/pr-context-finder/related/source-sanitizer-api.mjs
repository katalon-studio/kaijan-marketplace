import { createHash } from "node:crypto";
import { urlsplit, URL_PARSER_BASELINES } from "./urlsplit.mjs";
import { uriPattern } from "./unicode-word.mjs";
import {
  encodedJson,
  copyJsonMetadata,
  orderedObject,
  codepointCompare,
  utf8,
} from "./json.mjs";
export const CONTRACT = "pcf-source-screen/2";
export const CONTROL_LIMIT = 3 * (8388608 + 65536);
const digest = (value) => createHash("sha256").update(value).digest("hex");
export function secretsFromEnv(env, names) {
  return names.map((name) => {
    if (typeof env[name] !== "string" || !env[name])
      throw Error("source_secret_binding_unavailable");
    return env[name];
  });
}
export function sanitize(
  value,
  { secrets = [], urlParserBaseline = "python3.9.6" } = {},
) {
  if (
    !Array.isArray(secrets) ||
    secrets.some((s) => typeof s !== "string" || !s)
  )
    throw Error("source_secret_binding_invalid");
  if (!URL_PARSER_BASELINES.includes(urlParserBaseline))
    throw Error("source_url_parser_baseline");
  const bound = [...new Set(secrets)].sort(
    (a, b) => [...b].length - [...a].length || codepointCompare(a, b),
  );
  const changes = [];
  const string = (text, indices) => {
    const spans = [];
    for (const secret of bound) {
      let start = 0;
      while ((start = text.indexOf(secret, start)) >= 0) {
        const boundary = (index) =>
          !(
            index > 0 &&
            index < text.length &&
            /[\uDC00-\uDFFF]/.test(text[index]) &&
            /[\uD800-\uDBFF]/.test(text[index - 1])
          );
        if (boundary(start) && boundary(start + secret.length))
          spans.push([start, start + secret.length, "bound_secret"]);
        start++;
      }
    }
    for (const match of text.matchAll(uriPattern(urlParserBaseline))) {
      let authority;
      try {
        authority = urlsplit(match[0], { baseline: urlParserBaseline }).netloc;
      } catch {
        continue;
      }
      const at = authority.lastIndexOf("@"),
        info = authority.slice(0, at),
        colon = info.indexOf(":");
      if (at >= 0 && colon >= 0 && colon + 1 < info.length) {
        const offset = match.index + match[0].indexOf("://") + 3;
        spans.push([
          offset + colon + 1,
          offset + info.length,
          "URI_userinfo_password",
        ]);
      }
    }
    spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const [start, end, reason] of spans) {
      const last = merged.at(-1);
      if (last && start < last[1]) {
        last[1] = Math.max(last[1], end);
        last[2].add(reason);
      } else merged.push([start, end, new Set([reason])]);
    }
    let result = text;
    for (const [start, end] of [...merged].reverse())
      result =
        result.slice(0, start) +
        (text.slice(start, end) === "[REDACTED_CREDENTIAL]"
          ? "[REMOVED_CREDENTIAL]"
          : "[REDACTED_CREDENTIAL]") +
        result.slice(end);
    for (const [start, end, reasons] of merged)
      changes.push({
        path_indices: indices,
        span_start_codepoints: [...text.slice(0, start)].length,
        span_end_codepoints: [...text.slice(0, end)].length,
        reasons: [...reasons].sort(),
      });
    return result;
  };
  const walk = (item, indices = []) => {
    if (typeof item === "string") return string(item, indices);
    if (Array.isArray(item))
      return copyJsonMetadata(
        item,
        item.map((child, i) => walk(child, [...indices, i])),
      );
    if (item && typeof item === "object") {
      const keys = [];
      const entries = Object.entries(item).map(([key, child], i) => {
        const next = string(key, [...indices, i, "key"]);
        keys.push([key, next]);
        return [next, walk(child, [...indices, i, "value"])];
      });
      return copyJsonMetadata(item, orderedObject(entries), keys);
    }
    return item;
  };
  const result = walk(value);
  if (changes.length) {
    const original_document_sha256 = digest(utf8(encodedJson(value)));
    const transformed_document_sha256 = digest(utf8(encodedJson(result)));
    for (const change of changes)
      Object.assign(change, {
        original_document_sha256,
        transformed_document_sha256,
      });
  }
  return [result, changes];
}
