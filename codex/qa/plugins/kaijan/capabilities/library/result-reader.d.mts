import type { Buffer } from "node:buffer";

export type ResultGetter = (
  request: { runId: string; offset?: number },
  context: { signal: AbortSignal },
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface CompleteResultOptions {
  runId: string;
  maxBytes: number;
  initial?: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ResultReadError extends Error {
  constructor(
    code: string,
    context: {
      runId: string;
      operation: unknown;
      offset: number;
      bytesRead: number;
      pagesRead: number;
      cause?: unknown;
    },
  );
  code: string;
  runId: string;
  operation: unknown;
  offset: number;
  bytesRead: number;
  pagesRead: number;
}

export function readCompleteResult(
  get: ResultGetter,
  options: CompleteResultOptions,
): Promise<{
  operation: Record<string, unknown>;
  text: string;
  bytes: Buffer;
  sha256: string;
  pagesRead: number;
}>;
