export type JsonValue =
  | null
  | boolean
  | number
  | bigint
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export function parseJson(
  input: string | Uint8Array,
  options?: { duplicates?: "last" | "reject"; constants?: boolean },
): JsonValue;
export function parseStrict(input: string | Uint8Array): JsonValue;
export function encodedJson(
  value: JsonValue,
  options?: {
    sortKeys?: boolean;
    ascii?: boolean;
    indent?: number | null;
    compact?: boolean;
    allowNan?: boolean;
  },
): string;
export function utf8(value: string): Buffer;

export function codepointCompare(a: string, b: string): number;
export function orderedObject(
  entries: Iterable<readonly [string, JsonValue]>,
): { [key: string]: JsonValue };
/** Copy scalar token metadata with optional old/new key mapping. Values are not cloned. */
export function copyJsonMetadata<T extends object>(
  from: object,
  to: T,
  keys?: ReadonlyArray<readonly [string | number, string | number]>,
): T;
export function isJsonInteger(parent: object, key: string | number): boolean;
export function numberText(value: number | bigint, floating?: boolean): string;

export const JSON_DIAGNOSTIC_CONTRACT: "pcf-json-diagnostic/1";
export interface JsonDiagnostic {
  readonly contract: typeof JSON_DIAGNOSTIC_CONTRACT;
  readonly reason: string;
  readonly position: number;
  readonly line: number;
  readonly column: number;
}
/** Grammar error only; locations count Unicode codepoints in the decoded source. */
export class JsonSyntaxError extends SyntaxError {
  readonly code: "source_invalid_JSON";
  readonly diagnostic: JsonDiagnostic;
  constructor(reason: string, source: string, utf16Offset: number);
}
export function formatJsonDiagnostic(error: JsonSyntaxError): string;
