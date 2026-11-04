import { parseJson, encodedJson, codepointCompare } from "../related/json.mjs";
export const pySpace =
  "\\u0009-\\u000d\\u001c-\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const whitespace = new RegExp("^[" + pySpace + "]+|[" + pySpace + "]+$", "gu");
export const strip = (value) => value.replace(whitespace, "");
export const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export const truth = (value) =>
  value === null || value === undefined
    ? false
    : typeof value === "object"
      ? Object.keys(value).length !== 0
      : typeof value === "number" && Number.isNaN(value)
        ? true
        : Boolean(value);
export const first = (...values) => values.find(truth) ?? values.at(-1);
export const copy = (value) => parseJson(encodedJson(value));
export function equal(a, b) {
  if (a === b) return true;
  if ((a ?? null) === null || (b ?? null) === null) return false;
  if (
    (typeof a === "number" ||
      typeof a === "boolean" ||
      typeof a === "bigint") &&
    (typeof b === "number" || typeof b === "boolean" || typeof b === "bigint")
  ) {
    // The branch admits only numeric primitives. Boolean-to-number conversion
    // is exact; integer Number-to-BigInt comparison avoids rounding a BigInt.
    const left = typeof a === "boolean" ? Number(a) : a;
    const right = typeof b === "boolean" ? Number(b) : b;
    if (typeof left === typeof right) return left === right;
    const integer = typeof left === "bigint" ? left : right;
    const number = typeof left === "number" ? left : right;
    return Number.isInteger(number) && BigInt(number) === integer;
  }
  if (
    Array.isArray(a) !== Array.isArray(b) ||
    typeof a !== typeof b ||
    typeof a !== "object"
  )
    return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]))
  );
}
export const sorted = (values) => [...values].sort(codepointCompare);
export function splitlines(text) {
  // Scan the Python splitlines boundaries without embedding C0 bytes in a regex.
  // CRLF is one boundary; every other admitted code unit is one boundary.
  const lines = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if ([10, 11, 12, 13, 28, 29, 30, 133, 8232, 8233].includes(code)) {
      lines.push(text.slice(start, index));
      if (code === 13 && text.charCodeAt(index + 1) === 10) index++;
      start = index + 1;
    }
  }
  lines.push(text.slice(start));
  if (lines.at(-1) === "") lines.pop();
  return lines;
}
export const linkPattern = () =>
  /https:\/\/github\.com\/[\p{L}\p{N}_.-]+\/[\p{L}\p{N}_.-]+\/(?:issues|pull)\/[1-9]\p{Nd}*/gu;
export function links(sources) {
  const inspected = new Set(sources.map((s) => s.uri));
  return sorted(
    new Set(
      sources
        .flatMap((s) => [...s.text.matchAll(linkPattern())].map((m) => m[0]))
        .filter((url) => !inspected.has(url)),
    ),
  );
}
export function zonedDate(text) {
  // datetime.fromisoformat in the frozen supported baseline (Python 3.9).
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[\s\S](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{3}|\d{6}))?)?)?([+-]\d{2}:\d{2}(?::\d{2}(?:\.\d{6})?)?)?)?$/.exec(
      text.replaceAll("Z", "+00:00"),
    );
  if (!match) throw Error("Invalid isoformat string");
  const [, year, month, day, hour, minute, second, , offset] = match,
    ym = Number(year),
    mo = Number(month),
    da = Number(day);
  const days = [
    31,
    ym % 4 === 0 && (ym % 100 !== 0 || ym % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (ym < 1) throw Error("year " + ym + " is out of range");
  if (mo < 1 || mo > 12) throw Error("month must be in 1..12");
  if (da < 1 || da > days[mo - 1]) throw Error("day is out of range for month");
  if (Number(hour ?? 0) > 23) throw Error("hour must be in 0..23");
  if (Number(minute ?? 0) > 59) throw Error("minute must be in 0..59");
  if (Number(second ?? 0) > 59) throw Error("second must be in 0..59");
  if (!offset) throw Error("Capture time needs a timezone");
  const parts = offset.slice(1).split(":");
  if (
    Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2] ?? 0) >=
    86400
  )
    throw Error(
      "offset must be strictly between -timedelta(hours=24) and timedelta(hours=24)",
    );
  return true;
}

export function decimalInteger(text) {
  const clean = strip(text);
  if (!/^[+-]?\p{Nd}(?:_?\p{Nd})*$/u.test(clean))
    throw Error("invalid literal for int");
  const digits = [...clean]
    .filter((c) => c !== "_")
    .map((c) => {
      if (c === "+" || c === "-") return c;
      const cp = c.codePointAt(0);
      let first = cp;
      while (first > 0 && /\p{Nd}/u.test(String.fromCodePoint(first - 1)))
        first--;
      return String((cp - first) % 10);
    })
    .join("");
  return BigInt(digits);
}

export function finiteNonnegativeCost(value) {
  if (typeof value !== "number" && typeof value !== "bigint") return false;
  if (typeof value === "bigint" && !Number.isFinite(Number(value)))
    throw Object.assign(Error("int too large to convert to float"), {
      name: "OverflowError",
      legacyType: "OverflowError",
      uncaught: true,
    });
  return Number.isFinite(Number(value)) && value >= 0;
}
