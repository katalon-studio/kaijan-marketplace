import { createHash } from "node:crypto";
import { ValueError, JSONDecodeError } from "./errors.mjs";
import { jsonText } from "./unicode_bytes.mjs";
export { text } from "./unicode_bytes.mjs";
export { JSONDecodeError, errorDiagnostic } from "./errors.mjs";

// Acquired JSON must keep integer precision, float kind and object member order.
// Native JS objects remain supported; raw transport bytes use parseJson below.
const orders = new WeakMap();
export const orderedKeys = (value) =>
  [...new Set([...(orders.get(value) ?? []), ...Object.keys(value)])].filter(
    (key) => Object.hasOwn(value, key),
  );
class JsonFloat extends Number {
  constructor(value) {
    super(value);
    Object.freeze(this);
  }
}
const parsedNaN = new JsonFloat(NaN);
export const floating = (value) => new JsonFloat(value);
export const isObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const isInteger = (value) =>
  typeof value === "bigint" ||
  (typeof value === "number" && Number.isInteger(value));
export const positiveInteger = (value) => isInteger(value) && value > 0;
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export function utf8(value) {
  if (typeof value !== "string") throw new TypeError("Expected UTF-8 text");
  const points = [...value];
  for (let i = 0; i < points.length; i++) {
    const c = points[i].codePointAt(0);
    if (c >= 0xd800 && c <= 0xdfff) {
      let end = i + 1;
      while (
        end < points.length &&
        points[end].codePointAt(0) >= 0xd800 &&
        points[end].codePointAt(0) <= 0xdfff
      )
        end++;
      const range =
        end === i + 1
          ? `character '\\u${c.toString(16).padStart(4, "0")}' in position ${i}`
          : `characters in position ${i}-${end - 1}`;
      const error = new Error(
        `'utf-8' codec can't encode ${range}: surrogates not allowed`,
      );
      error.name = "UnicodeEncodeError";
      throw error;
    }
  }
  return Buffer.from(value, "utf8");
}
export function parseJson(
  raw,
  { rejectDuplicates = false, allowNonFinite = true } = {},
) {
  const source = typeof raw === "string" ? raw : jsonText(raw);
  let i = 0;
  const space = () => {
    while (/[\x20\t\r\n]/.test(source[i] ?? "\0")) i++;
  };
  const fail = (message = "Expecting value", offset = i) => {
    throw new JSONDecodeError(message, source, offset);
  };
  if (typeof raw === "string" && source.startsWith("\ufeff"))
    fail("Unexpected UTF-8 BOM (decode using utf-8-sig)", 0);
  function string() {
    const start = i++;
    let result = "";
    while (i < source.length) {
      const c = source[i++];
      if (c === '"') return result;
      if (c.charCodeAt(0) <= 0x1f) fail("Invalid control character at", i - 1);
      if (c === "\\") {
        if (i >= source.length) fail("Unterminated string starting at", start);
        const escape = source[i++];
        const simple = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (Object.hasOwn(simple, escape)) result += simple[escape];
        else if (escape === "u") {
          const digits = source.slice(i, i + 4);
          if (i + 4 >= source.length || !/^[0-9a-fA-F]{4}$/.test(digits))
            fail("Invalid \\uXXXX escape", i - 1);
          result += String.fromCharCode(Number.parseInt(digits, 16));
          i += 4;
        } else fail("Invalid \\escape", i - 2);
        continue;
      }
      result += c;
    }
    return fail("Unterminated string starting at", start);
  }
  function value() {
    space();
    if (source[i] === '"') return string();
    if (source[i] === "{") {
      i++;
      space();
      const result = {};
      const keys = [];
      let duplicate = false;
      if (source[i] !== "}")
        while (true) {
          space();
          if (source[i] !== '"')
            fail("Expecting property name enclosed in double quotes");
          const key = string();
          if (keys.includes(key)) duplicate = true;
          if (!keys.includes(key)) keys.push(key);
          space();
          if (source[i] !== ":") fail("Expecting ':' delimiter");
          i++;
          Object.defineProperty(result, key, {
            value: value(),
            enumerable: true,
            writable: true,
            configurable: true,
          });
          space();
          if (source[i] === "}") break;
          if (source[i] !== ",") fail("Expecting ',' delimiter");
          i++;
        }
      i++;
      // The original pairs hook runs after a complete object is parsed.
      if (duplicate && rejectDuplicates)
        throw new ValueError("duplicate_JSON_property");
      orders.set(result, keys);
      return result;
    }
    if (source[i] === "[") {
      i++;
      space();
      const result = [];
      if (source[i] !== "]")
        while (true) {
          result.push(value());
          space();
          if (source[i] === "]") break;
          if (source[i] !== ",") fail("Expecting ',' delimiter");
          i++;
        }
      i++;
      return result;
    }
    for (const [token, result] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ]) {
      if (source.startsWith(token, i)) {
        i += token.length;
        return result;
      }
    }
    for (const [token, result] of [
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
    ]) {
      if (source.startsWith(token, i)) {
        if (!allowNonFinite) throw new ValueError("invalid_JSON_constant");
        i += token.length;
        return token === "NaN" ? parsedNaN : new JsonFloat(result);
      }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      source.slice(i),
    );
    if (!match) fail();
    const token = match[0];
    i += token.length;
    if (/[.eE]/.test(token)) return new JsonFloat(Number(token));
    if (token.replace("-", "").length > 4300)
      throw new ValueError(
        `Exceeds the limit (4300 digits) for integer string conversion: value has ${token.replace("-", "").length} digits; use sys.set_int_max_str_digits() to increase the limit`,
      );
    const n = BigInt(token);
    return n <= BigInt(Number.MAX_SAFE_INTEGER) &&
      n >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(n)
      : n;
  }
  const result = value();
  space();
  if (i !== source.length) fail("Extra data");
  return result;
}
function number(value, allowNonFinite) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    if (!allowNonFinite)
      throw new ValueError(
        "Out of range float values are not JSON compliant: " +
          (Number.isNaN(n) ? "nan" : n < 0 ? "-inf" : "inf"),
      );
    return Number.isNaN(n) ? "NaN" : n < 0 ? "-Infinity" : "Infinity";
  }
  if (Object.is(n, -0)) return value instanceof JsonFloat ? "-0.0" : "0";
  let result = String(n);
  if (value instanceof JsonFloat) {
    if (n !== 0 && (Math.abs(n) < 0.0001 || Math.abs(n) >= 1e16))
      result = n.toExponential();
    else if (!result.includes(".") && !result.includes("e")) result += ".0";
  }
  return result.replace(
    /e([+-]?)(\d)$/,
    (_, sign, digit) => `e${sign || "+"}0${digit}`,
  );
}
export function jsonString(
  value,
  {
    indent = 2,
    sortKeys = false,
    ensureAscii = false,
    allowNonFinite = false,
  } = {},
) {
  const seen = new Set();
  const quote = (value) => {
    let result = '"';
    const escapes = {
      '"': '\\"',
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "\t": "\\t",
    };
    for (let i = 0; i < value.length; i++) {
      const c = value[i],
        cp = value.charCodeAt(i);
      result +=
        escapes[c] ??
        (cp < 0x20 || (ensureAscii && cp >= 0x7f)
          ? `\\u${cp.toString(16).padStart(4, "0")}`
          : c);
    }
    return result + '"';
  };
  function write(v, depth) {
    if (v === null || typeof v === "boolean") return String(v);
    if (typeof v === "string") return quote(v);
    if (typeof v === "bigint") {
      const value = String(v);
      if (value.replace("-", "").length > 4300)
        throw new ValueError(
          "Exceeds the limit (4300 digits) for integer string conversion; use sys.set_int_max_str_digits() to increase the limit",
        );
      return value;
    }
    if (typeof v === "number" || v instanceof JsonFloat)
      return number(v, allowNonFinite);
    if (!Array.isArray(v) && !isObject(v))
      throw new TypeError("Value is not JSON data");
    if (seen.has(v)) throw new ValueError("Circular reference detected");
    seen.add(v);
    const array = Array.isArray(v);
    const keys = array
      ? v.map((_, index) => index)
      : (orders.get(v) ?? Object.keys(v)).filter((k) => Object.hasOwn(v, k));
    if (!array)
      for (const k of Object.keys(v)) if (!keys.includes(k)) keys.push(k);
    if (!array && sortKeys)
      keys.sort((a, b) => {
        const left = [...a],
          right = [...b];
        for (let i = 0; i < Math.min(left.length, right.length); i++) {
          const delta = left[i].codePointAt(0) - right[i].codePointAt(0);
          if (delta) return delta;
        }
        return left.length - right.length;
      });
    const rows = keys.map(
      (k) => `${array ? "" : quote(String(k)) + ": "}${write(v[k], depth + 1)}`,
    );
    seen.delete(v);
    if (!rows.length) return array ? "[]" : "{}";
    if (!indent)
      return `${array ? "[" : "{"}${rows.join(", ")}${array ? "]" : "}"}`;
    return `${array ? "[" : "{"}\n${rows.map((r) => " ".repeat(indent * (depth + 1)) + r).join(",\n")}\n${" ".repeat(indent * depth)}${array ? "]" : "}"}`;
  }
  return write(value, 0);
}
export const encoded = (value) => utf8(jsonString(value) + "\n");
export function cloneJson(value, seen = new Map()) {
  if (value instanceof JsonFloat) return value;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  if (orders.has(value)) orders.set(result, [...orders.get(value)]);
  for (const key of Object.keys(value))
    Object.defineProperty(result, key, {
      value: cloneJson(value[key], seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return result;
}
