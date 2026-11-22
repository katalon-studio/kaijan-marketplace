import { requestHttp } from "@katalon-experiments/ai-client";
import { createManagedResponsesSession } from "@katalon-experiments/ai-client/responses-session";
import { Readable } from "node:stream";
export const header = (response, key) =>
  Object.entries(response.headers ?? {}).find(
    ([name]) => name.toLowerCase() === key.toLowerCase(),
  )?.[1];
export function native(request, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const req = requestHttp(
      {
        url: request.url,
        headers: request.headers,
        ...(request.socketPath ? { socketPath: request.socketPath } : {}),
      },
      { method: request.method, headers: request.headers, signal },
      (response) =>
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: response,
          close: () => response.destroy(),
        }),
    );
    req.setTimeout(request.inactivityTimeoutMs ?? request.timeoutMs, () =>
      req.destroy(
        Object.assign(Error("provider socket inactivity timeout"), {
          legacyType: "TimeoutError",
        }),
      ),
    );
    req.once("error", reject);
    req.end(request.body);
  });
}

/** Preserve the native streaming reader when a managed turn falls back to HTTP. */
export function managedPlanningSession(connection, request, storeResponses) {
  return createManagedResponsesSession({
    connection,
    storeResponses,
    requestAI: async (_body, signal) => {
      const response = await native(request, { signal });
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        for (const entry of Array.isArray(value) ? value : [value]) {
          if (entry !== undefined) headers.append(name, entry);
        }
      }
      if ([204, 205, 304].includes(response.status)) {
        response.close();
        return new Response(null, { status: response.status, headers });
      }
      return new Response(Readable.toWeb(response.body), {
        status: response.status,
        headers,
      });
    },
  });
}

export function planningResponse(response) {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: response.body ?? new Uint8Array(),
    close: () => response.body?.cancel(),
  };
}

export async function* responseChunks(response, size = 65536) {
  if (response.body instanceof Uint8Array) {
    for (let i = 0; i < response.body.length; i += size)
      yield Buffer.from(response.body.subarray(i, i + size));
  } else {
    for await (const chunk of response.body) yield Buffer.from(chunk);
  }
}
export const failureType = (error) =>
  error.legacyType ??
  (error.name === "TimeoutError"
    ? "TimeoutError"
    : error.name === "AbortError"
      ? "FilterStopped"
      : error.code === "ETIMEDOUT"
        ? "TimeoutError"
        : "OSError");

export async function callTransport(transport, request, { signal } = {}) {
  signal?.throwIfAborted();
  if (!signal) return await transport(request, { signal });
  let stop;
  const interrupted = new Promise((_, reject) => {
    stop = () => reject(signal.reason);
    signal.addEventListener("abort", stop, { once: true });
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        signal.throwIfAborted();
        return transport(request, { signal });
      }),
      interrupted,
    ]);
  } finally {
    signal.removeEventListener("abort", stop);
  }
}
