import { RelatedError } from "./records.mjs";

// Only canonical transports construct this after screening and receipt validation.
// Keep the public error code; acquisition chooses bounded continuation.
export class ConfirmedGithubNotFound extends RelatedError {
  constructor() {
    super("github_unavailable");
    this.http_status = 404;
  }
}

/** Parse gh api --include without changing the body or original stdout bytes. */
export function includedGhResponse(stdout) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  if (!text.startsWith("HTTP/")) return null;
  const boundary = /\r?\n\r?\n/.exec(text);
  if (!boundary) return null;
  const lines = text.slice(0, boundary.index).split(/\r?\n/);
  const status = /^HTTP\/\d+(?:\.\d+)? ([1-5][0-9]{2})(?: [^\r\n]*)?$/.exec(
    lines.shift(),
  );
  if (!status) return null;
  const headers = new Map();
  for (const line of lines) {
    const header = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\r\n]*)$/.exec(
      line,
    );
    if (!header) return null;
    const name = header[1].toLowerCase();
    if (!headers.has(name)) headers.set(name, []);
    headers.get(name).push(header[2]);
  }
  const bodyOffset = Buffer.byteLength(
    text.slice(0, boundary.index + boundary[0].length),
  );
  return {
    status: Number(status[1]),
    headers,
    body: stdout.subarray(bodyOffset),
  };
}

export function completeGhNotFound(response, error, data) {
  if (
    response?.status !== 404 ||
    error?.code !== 1 ||
    error.signal ||
    error.killed ||
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data)
  )
    return false;
  // gh reads and parses JSON error bodies completely before writing them.
  // Missing headers/non-JSON errors/interrupted processes cannot establish this.
  // No stderr phrases participate in the decision.
  const types = response.headers.get("content-type") ?? [];
  if (
    types.length !== 1 ||
    !/^application\/(?:[^;\s]+\+)?json(?:\s*;|$)/i.test(types[0])
  )
    return false;
  const lengths = response.headers.get("content-length") ?? [];
  return (
    lengths.length === 0 ||
    (lengths.length === 1 &&
      /^[0-9]+$/.test(lengths[0]) &&
      Number(lengths[0]) === response.body.length)
  );
}
