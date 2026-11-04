import { WORD_CLASS, DECIMAL_CLASS } from "./unicode_properties.mjs";
import { pythonInteger } from "./python_integer.mjs";
import { ValueError } from "./errors.mjs";
export const REPOSITORY_PATTERN =
  "[A-Za-z0-9][" + WORD_CLASS + ".-]*/[A-Za-z0-9][" + WORD_CLASS + ".-]*";
export const REPOSITORY = new RegExp(
  "^(?:" + REPOSITORY_PATTERN + ")$(?![\\s\\S])",
  "u",
);
export const SOURCE_URL = new RegExp(
  "^https://github\\.com/(" +
    REPOSITORY_PATTERN +
    ")/(issues|pull)/([1-9][" +
    DECIMAL_CLASS +
    "]*)$(?![\\s\\S])",
  "u",
);
export function parseUrl(url) {
  const match = SOURCE_URL.exec(url);
  if (!match) throw new ValueError("exact_github_issue_or_pr_url_required");
  const n = pythonInteger(match[3]);
  return {
    repo: match[1],
    kind: match[2] === "issues" ? "issue" : "pr",
    number: n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n,
    url,
  };
}
