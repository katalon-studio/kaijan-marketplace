/** JSON grammar diagnostics from CPython3.9.6 (see JSON-PARSER-NOTICES.txt). */
export const JSON_DIAGNOSTIC_CONTRACT = "pcf-json-diagnostic/1";
export class JsonSyntaxError extends SyntaxError {
  constructor(reason, source, utf16Offset) {
    super("source_invalid_JSON");
    this.name = "JsonSyntaxError";
    this.code = "source_invalid_JSON";
    const prefix = source.slice(0, utf16Offset);
    const position = Array.from(prefix).length;
    const line = prefix.split("\n").length;
    const column =
      Array.from(prefix.slice(prefix.lastIndexOf("\n") + 1)).length + 1;
    this.diagnostic = Object.freeze({
      contract: JSON_DIAGNOSTIC_CONTRACT,
      reason,
      position,
      line,
      column,
    });
  }
}
export function formatJsonDiagnostic(error) {
  if (!(error instanceof JsonSyntaxError))
    throw TypeError("json_syntax_error_required");
  const { reason, position, line, column } = error.diagnostic;
  return (
    reason + ": line " + line + " column " + column + " (char " + position + ")"
  );
}
const metadata = new WeakMap();
export const codepointCompare = (a, b) => {
  const x = Array.from(a, (c) => c.codePointAt(0)),
    y = Array.from(b, (c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++)
    if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
};
export function orderedObject(entries) {
  const keys = [],
    target = {};
  for (const [key, value] of entries) {
    if (!Object.hasOwn(target, key)) keys.push(key);
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return new Proxy(target, {
    ownKeys: () => [
      ...keys.filter((k) => Object.hasOwn(target, k)),
      ...Reflect.ownKeys(target).filter((k) => !keys.includes(k)),
    ],
  });
}
export function copyJsonMetadata(from, to, keys) {
  const m = metadata.get(from);
  if (m)
    metadata.set(
      to,
      keys
        ? new Map(
            keys.map(([oldKey, newKey]) => [
              String(newKey),
              m.get(String(oldKey)),
            ]),
          )
        : new Map(m),
    );
  return to;
}
export function parseJson(
  input,
  { duplicates = "last", constants = true } = {},
) {
  const source =
    typeof input === "string"
      ? input
      : new TextDecoder("utf-8", { fatal: true }).decode(input);
  let offset = 0;
  const fail = (reason, position = offset) => {
      throw new JsonSyntaxError(reason, source, position);
    },
    space = () => {
      while (/[\x20\t\r\n]/.test(source[offset] ?? "\0")) offset++;
    };
  const string = () => {
    const start = offset++;
    while (offset < source.length) {
      const code = source.charCodeAt(offset),
        char = source[offset];
      if (code <= 31) fail("Invalid control character at");
      if (char === '"') {
        offset++;
        return JSON.parse(source.slice(start, offset));
      }
      if (char !== "\\") {
        offset++;
        continue;
      }
      const slash = offset++;
      if (offset === source.length)
        fail("Unterminated string starting at", start);
      if (source[offset] === "u") {
        if (
          offset + 5 >= source.length ||
          !/^[0-9a-fA-F]{4}$/.test(source.slice(offset + 1, offset + 5))
        )
          fail("Invalid \\uXXXX escape");
        offset += 5;
      } else {
        if (!'"\\/bfnrt'.includes(source[offset]))
          fail("Invalid \\escape", slash);
        offset++;
      }
    }
    fail("Unterminated string starting at", start);
  };
  const value = () => {
    space();
    let item;
    if (source[offset] === '"') return [string()];
    if (source[offset] === "{") {
      offset++;
      space();
      const entries = [],
        types = new Map();
      if (source[offset] !== "}")
        while (true) {
          space();
          if (source[offset] !== '"')
            fail("Expecting property name enclosed in double quotes");
          const key = string();
          space();
          if (source[offset] !== ":") fail("Expecting ':' delimiter");
          offset++;
          const [child, type] = value();
          entries.push([key, child]);
          if (type !== undefined) types.set(key, type);
          else types.delete(key);
          space();
          if (source[offset] === "}") break;
          if (source[offset] !== ",") fail("Expecting ',' delimiter");
          offset++;
        }
      offset++;
      if (
        duplicates === "reject" &&
        new Set(entries.map(([key]) => key)).size !== entries.length
      )
        throw Error("source_duplicate_key");
      const result = orderedObject(entries);
      metadata.set(result, types);
      return [result];
    }
    if (source[offset] === "[") {
      offset++;
      space();
      const result = [],
        types = new Map();
      if (source[offset] !== "]")
        while (true) {
          const [child, type] = value();
          if (type !== undefined) types.set(String(result.length), type);
          result.push(child);
          space();
          if (source[offset] === "]") break;
          if (source[offset] !== ",") fail("Expecting ',' delimiter");
          offset++;
        }
      offset++;
      metadata.set(result, types);
      return [result];
    }
    for (const [literal, result] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ])
      if (source.startsWith(literal, offset)) {
        offset += literal.length;
        return [result];
      }
    for (const [literal, result] of [
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
    ])
      if (source.startsWith(literal, offset)) {
        if (!constants) throw Error("source_invalid_constant");
        offset += literal.length;
        return [result, literal];
      }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      source.slice(offset),
    );
    if (!match) fail("Expecting value");
    const token = match[0];
    offset += token.length;
    if (/^-?\d+$/.test(token)) {
      const n = BigInt(token);
      item = n > 9007199254740991n || n < -9007199254740991n ? n : Number(n);
    } else item = Number(token);
    return [item, token];
  };
  if (source[0] === "\uFEFF")
    fail("Unexpected UTF-8 BOM (decode using utf-8-sig)", 0);
  const result = value()[0];
  space();
  if (offset !== source.length) fail("Extra data");
  return result;
}
export const parseStrict = (input) =>
  parseJson(input, { duplicates: "reject", constants: false });
export function isJsonInteger(parent, key) {
  const token = metadata.get(parent)?.get(String(key));
  return token === undefined
    ? Number.isInteger(parent[key])
    : /^-?\d+$/.test(token);
}
function floatRepr(number) {
  if (Number.isNaN(number)) return "NaN";
  if (!Number.isFinite(number)) return number < 0 ? "-Infinity" : "Infinity";
  if (Object.is(number, -0)) return "-0.0";
  let s = String(number);
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  const parts = s.split("e");
  let digits = parts[0];
  const exponent = parts[1];
  let exp = exponent === undefined ? 0 : Number(exponent);
  let point = digits.indexOf(".");
  if (point < 0) point = digits.length;
  digits = digits.replace(".", "");
  exp += point - 1;
  while (digits.length > 1 && digits[0] === "0") {
    digits = digits.slice(1);
    exp--;
  }
  while (digits.length > 1 && digits.endsWith("0"))
    digits = digits.slice(0, -1);
  let value;
  if (exp < -4 || exp >= 16)
    value =
      digits[0] +
      (digits.length > 1 ? "." + digits.slice(1) : "") +
      "e" +
      (exp < 0 ? "-" : "+") +
      String(Math.abs(exp)).padStart(2, "0");
  else if (exp < 0) value = "0." + "0".repeat(-exp - 1) + digits;
  else if (exp + 1 >= digits.length)
    value = digits + "0".repeat(exp + 1 - digits.length) + ".0";
  else value = digits.slice(0, exp + 1) + "." + digits.slice(exp + 1);
  return (neg ? "-" : "") + value;
}
/** Legacy JSON wire semantics, retained for hashes and request bytes. */
export function encodedJson(
  value,
  {
    sortKeys = false,
    ascii = false,
    indent = null,
    compact = false,
    allowNan = true,
  } = {},
) {
  const quote = (text) => {
    let result = '"';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i),
        c = text[i];
      if (c === '"' || c === "\\") result += "\\" + c;
      else if (code === 8) result += "\\b";
      else if (code === 9) result += "\\t";
      else if (code === 10) result += "\\n";
      else if (code === 12) result += "\\f";
      else if (code === 13) result += "\\r";
      else if (code < 32 || (ascii && code >= 127))
        result += "\\u" + code.toString(16).padStart(4, "0");
      else result += c;
    }
    return result + '"';
  };
  const visit = (item, depth, token) => {
    if (item === null) return "null";
    if (typeof item === "string") return quote(item);
    if (typeof item === "bigint") return String(item);
    if (typeof item === "number") {
      if (!allowNan && !Number.isFinite(item)) throw Error("non_finite_json");
      if (
        (token !== undefined && !/^-?\d+$/.test(token)) ||
        (token === undefined && !Number.isInteger(item))
      )
        return floatRepr(item);
      if (!Number.isFinite(item)) return floatRepr(item);
      return String(Object.is(item, -0) ? 0 : item);
    }
    if (typeof item === "boolean") return String(item);
    if (!item || typeof item !== "object")
      throw Error("unsupported_json_value");
    const array = Array.isArray(item);
    const entries = array
      ? item.map((v, i) => [String(i), v])
      : Object.entries(item);
    if (sortKeys && !array) entries.sort(([a], [b]) => codepointCompare(a, b));
    if (!entries.length) return array ? "[]" : "{}";
    const left = array ? "[" : "{",
      right = array ? "]" : "}",
      types = metadata.get(item);
    const values = entries.map(
      ([key, v]) =>
        (array ? "" : quote(key) + (compact ? ":" : ": ")) +
        visit(v, depth + 1, types?.get(key)),
    );
    if (indent !== null)
      return (
        left +
        "\n" +
        values.map((v) => " ".repeat(indent * (depth + 1)) + v).join(",\n") +
        "\n" +
        " ".repeat(indent * depth) +
        right
      );
    return left + values.join(compact ? "," : ", ") + right;
  };
  return visit(value, 0);
}
export function utf8(text) {
  if (!text.isWellFormed()) throw Error("source_UTF8");
  return Buffer.from(text);
}

export const numberText = (value, floating = false) =>
  floating ? floatRepr(value) : String(Object.is(value, -0) ? 0 : value);
