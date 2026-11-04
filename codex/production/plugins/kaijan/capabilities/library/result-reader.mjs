import { createHash } from "node:crypto";

export class ResultReadError extends Error {
  constructor(code, context) {
    super("Retained result read failed: " + code, { cause: context.cause });
    this.name = "ResultReadError";
    this.code = code;
    Object.assign(this, context);
  }
}

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const positive = (value) => Number.isSafeInteger(value) && value > 0;

/** Read original bytes only. The callback must implement get, never operation start. */
export async function readCompleteResult(
  get,
  { runId, maxBytes, initial, signal, timeoutMs } = {},
) {
  if (
    typeof get !== "function" ||
    typeof runId !== "string" ||
    !runId ||
    !positive(maxBytes)
  )
    throw new TypeError(
      "A get callback, original runId and explicit positive maxBytes are required",
    );
  if (
    timeoutMs !== undefined &&
    (!positive(timeoutMs) || timeoutMs > 2147483647)
  )
    throw new TypeError("Invalid complete-read timeoutMs");
  const signals = [
    signal,
    timeoutMs === undefined ? null : AbortSignal.timeout(timeoutMs),
  ].filter(Boolean);
  const active = signals.length
    ? AbortSignal.any(signals)
    : new AbortController().signal;
  const expiresAt =
    timeoutMs === undefined ? Infinity : performance.now() + timeoutMs;
  const check = () => {
    active.throwIfAborted();
    if (performance.now() >= expiresAt)
      throw new DOMException("Complete result read timed out", "TimeoutError");
  };
  let operation = null,
    offset = 0,
    bytesRead = 0,
    pagesRead = 0;
  const fail = (code, cause) => {
    throw new ResultReadError(code, {
      runId,
      operation,
      offset,
      bytesRead,
      pagesRead,
      cause,
    });
  };
  const read = (request) => {
    check();
    return new Promise((resolve, reject) => {
      const aborted = () => reject(active.reason);
      active.addEventListener("abort", aborted, { once: true });
      Promise.resolve()
        .then(() => {
          check();
          return get(request, { signal: active });
        })
        .then(resolve, reject)
        .finally(() => active.removeEventListener("abort", aborted));
    });
  };
  check();
  operation = initial === undefined ? await read({ runId }) : initial;
  check();
  if (operation?.schema === "loki.runner-error/1")
    fail("runner_read_failed", operation.error);
  if (!object(operation) || operation.runId !== runId)
    fail("invalid_operation_identity");
  if (operation.state !== "finished" || operation.resultValidated !== true)
    fail("result_unavailable");
  const expectedHash = operation.resultSha256,
    expectedBytes = operation.resultBytes;
  if (
    typeof expectedHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(expectedHash) ||
    !positive(expectedBytes)
  )
    fail("missing_result_identity");
  if (expectedBytes > maxBytes) fail("byte_bound_exceeded");
  let totalCharacters = null,
    page = null;
  if (Object.hasOwn(operation, "resultChunk")) {
    page = operation;
  } else if (Object.hasOwn(operation, "resultRead")) {
    const header = operation.resultRead;
    if (
      !object(header) ||
      header.nextOffset !== 0 ||
      !positive(header.totalCharacters)
    )
      fail("invalid_metadata_cursor");
    totalCharacters = header.totalCharacters;
    if (totalCharacters > expectedBytes) fail("invalid_character_count");
  } else if (!Object.hasOwn(operation, "result")) {
    fail("missing_result_transport");
  }
  // Inline JSON is parsed data, not authoritative raw text. Offset reads preserve
  // its original spelling, whitespace, Unicode, numeric tokens and byte hash too.
  const chunks = [];
  for (;;) {
    page ??= await read({ runId, offset });
    check();
    if (page?.schema === "loki.runner-error/1")
      fail("runner_read_failed", page.error);
    if (
      !object(page) ||
      page.runId !== runId ||
      page.state !== operation.state ||
      page.resultValidated !== true ||
      page.resultSha256 !== expectedHash ||
      page.resultBytes !== expectedBytes
    )
      fail("result_identity_changed");
    const chunk = page.resultChunk;
    if (
      !object(chunk) ||
      chunk.encoding !== "JSON text, UTF-16 offsets" ||
      typeof chunk.text !== "string"
    )
      fail("missing_content_chunk");
    if (chunk.offset !== offset) fail("unexpected_content_offset");
    if (!chunk.text.length) fail("nonadvancing_content");
    if (!chunk.text.isWellFormed()) fail("invalid_unicode_chunk");
    if (
      !positive(chunk.totalCharacters) ||
      (totalCharacters !== null && chunk.totalCharacters !== totalCharacters)
    )
      fail("character_count_changed");
    totalCharacters = chunk.totalCharacters;
    if (totalCharacters > expectedBytes) fail("invalid_character_count");
    const end = offset + chunk.text.length;
    if (end > totalCharacters) fail("content_exceeds_total");
    if (chunk.nextOffset !== (end === totalCharacters ? null : end))
      fail("invalid_content_cursor");
    const bytes = Buffer.from(chunk.text, "utf8");
    bytesRead += bytes.length;
    if (bytesRead > maxBytes || bytesRead > expectedBytes)
      fail("byte_bound_exceeded");
    chunks.push(bytes);
    pagesRead++;
    offset = end;
    if (chunk.nextOffset === null) break;
    page = null;
  }
  const bytes = Buffer.concat(chunks),
    text = bytes.toString("utf8");
  if (bytes.length !== expectedBytes) fail("incomplete_result_bytes");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expectedHash) fail("result_hash_mismatch");
  try {
    JSON.parse(text);
  } catch (cause) {
    fail("invalid_result_json", cause);
  }
  check();
  return { operation, text, bytes, sha256, pagesRead };
}
