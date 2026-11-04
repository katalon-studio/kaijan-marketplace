import { readFileSync } from "node:fs";
// The existing explicit caller runtime selects both URL and regex semantics.
const versions = { "python3.9.6": "13.0.0", "python3.12.14": "15.0.0" };
const escape = (cp) => "\\u{" + cp.toString(16) + "}";
const patterns = new Map(
  Object.entries(versions).map(([baseline, version]) => {
    const { ranges } = JSON.parse(
      readFileSync(
        new URL(`./unicode-word-${version}.json`, import.meta.url),
        "utf8",
      ),
    );
    const word = ranges
      .map(([start, end]) =>
        start === end ? escape(start) : escape(start) + "-" + escape(end),
      )
      .join("");
    return [
      baseline,
      `(?<![${word}])[A-Za-z][A-Za-z0-9+.-]*:\\/\\/[^\\u0009-\\u000d\\u001c-\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000<>"'\\\\]+`,
    ];
  }),
);
export function uriPattern(baseline) {
  if (!patterns.has(baseline)) throw Error("source_url_parser_baseline");
  // Each scan owns lastIndex; concurrent/reentrant callers share no regex state.
  return new RegExp(patterns.get(baseline), "gu");
}
