import { readFileSync } from "node:fs";
const data = JSON.parse(
  readFileSync(
    new URL("./data/GeneralCategory-15.0.0.json", import.meta.url),
    "utf8",
  ),
);
export function category(character) {
  const cp = character.codePointAt(0);
  let lo = 0,
    hi = data.categories.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1,
      [start, end, value] = data.categories[mid];
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return value;
  }
  return "Cn";
}
const escape = (cp) => "\\u{" + cp.toString(16) + "}";
const ranges = (selected) =>
  data.categories
    .filter(([, , cat]) => selected(cat))
    .map(
      ([start, end]) =>
        escape(start) + (start === end ? "" : "-" + escape(end)),
    )
    .join("");
export const WORD_CLASS = ranges((cat) => /^[LN]/u.test(cat)) + "_";
export const DECIMAL_CLASS = ranges((cat) => cat === "Nd");
export function normalizeNfkc(value) {
  let result = "",
    segment = "";
  for (const c of value) {
    if (category(c) === "Cn") {
      result += segment.normalize("NFKC") + c;
      segment = "";
    } else segment += c;
  }
  return result + segment.normalize("NFKC");
}
export function reprString(value) {
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
  let result = "";
  for (const c of value) {
    const cp = c.codePointAt(0);
    if (c === quote || c === "\\") result += "\\" + c;
    else if (c === "\t") result += "\\t";
    else if (c === "\n") result += "\\n";
    else if (c === "\r") result += "\\r";
    else if (c !== " " && /^[CZ]/u.test(category(c)))
      result +=
        cp < 256
          ? "\\x" + cp.toString(16).padStart(2, "0")
          : cp <= 0xffff
            ? "\\u" + cp.toString(16).padStart(4, "0")
            : "\\U" + cp.toString(16).padStart(8, "0");
    else result += c;
  }
  return quote + result + quote;
}
