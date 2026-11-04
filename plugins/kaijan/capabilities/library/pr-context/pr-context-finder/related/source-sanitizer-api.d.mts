export type JsonValue =
  | null
  | boolean
  | number
  | bigint
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export interface CredentialChange {
  path_indices: (number | "key" | "value")[];
  span_start_codepoints: number;
  span_end_codepoints: number;
  reasons: string[];
  original_document_sha256: string;
  transformed_document_sha256: string;
}
export const CONTRACT: "pcf-source-screen/2";
export const CONTROL_LIMIT: number;
export function sanitize(
  value: JsonValue,
  options?: {
    secrets?: string[];
    /** Fixed caller runtime: URL grammar and Unicode word membership. */
    urlParserBaseline?: "python3.9.6" | "python3.12.14";
  },
): [JsonValue, CredentialChange[]];
export function secretsFromEnv(
  env: Record<string, string | undefined>,
  names: string[],
): string[];
