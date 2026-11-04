import { readFileSync } from "node:fs";
import { ValueError } from "./errors.mjs";
import { reprString as literal } from "./unicode_properties.mjs";
const data = JSON.parse(
  readFileSync(
    new URL("./data/DecimalDigits-15.0.0.json", import.meta.url),
    "utf8",
  ),
);
const digits = new Map(
  data.digits.map(([cp, value]) => [
    String.fromCodePoint(Number.parseInt(cp, 16)),
    String(value),
  ]),
);
export function pythonInteger(value) {
  const source = [
    ...String(value).replace(/^\p{White_Space}+|\p{White_Space}+$/gu, ""),
  ]
    .map((c) => digits.get(c) ?? c)
    .join("");
  if (!/^[+-]?[0-9](?:_?[0-9])*$/u.test(source))
    throw new ValueError(
      `invalid literal for int() with base 10: ${literal(String(value))}`,
    );
  const decimal = source.replaceAll("_", "");
  // CPython 3.12 baseline's default decimal string conversion limit.
  const count = decimal.replace(/^[+-]/u, "").length;
  if (count > 4300)
    throw new ValueError(
      `Exceeds the limit (4300 digits) for integer string conversion: value has ${count} digits; use sys.set_int_max_str_digits() to increase the limit`,
    );
  return BigInt(decimal);
}
