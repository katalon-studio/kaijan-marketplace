export { zdrRequest } from "./retention.mjs";
import { channelFetch } from "./broker-channel.mjs";
import { lstatSync } from "node:fs";
import { dirname } from "node:path";
import http from "node:http";
import https from "node:https";
export {
  AiClientError,
  providerConnection,
  requireManagedBinding,
} from "./litellm-route.mjs";

function headersFor(connection, supplied = {}) {
  // Replace inherited authorization with the key for this exact native provider.
  const headers =
    supplied instanceof Headers || Array.isArray(supplied)
      ? Object.fromEntries(
          supplied instanceof Headers ? supplied.entries() : supplied,
        )
      : { ...supplied };
  for (const name of Object.keys(headers))
    if (
      [
        "authorization",
        "x-loki-plan-id",
        "x-loki-run-id",
        "x-kaijan-ai-connection",
      ].includes(name.toLowerCase())
    )
      delete headers[name];
  return { ...headers, ...connection.headers };
}

// Return the native stream untouched. The caller keeps its existing bounded
// reader, schema checks, usage parser, persistence, deadline and Stop contract.
export function sendFetch(connection, options, transport = globalThis.fetch) {
  if (
    !connection.socketPath &&
    Object.keys(connection.headers ?? {}).some(
      (name) => name.toLowerCase() === "x-kaijan-ai-connection",
    )
  )
    throw Error("connection_binding_requires_broker");
  if (connection.socketPath)
    return channelFetch(
      connection.socketPath,
      new URL(connection.url).pathname,
      { ...options, headers: headersFor(connection, options.headers) },
    );
  return transport(connection.url, {
    ...options,
    redirect: "error",
    headers: headersFor(connection, options.headers),
  });
}

export function requestHttp(connection, options, callback, transport) {
  if (
    !connection.socketPath &&
    Object.keys(connection.headers ?? {}).some(
      (name) => name.toLowerCase() === "x-kaijan-ai-connection",
    )
  )
    throw Error("connection_binding_requires_broker");
  if (connection.socketPath) {
    const directory = lstatSync(dirname(connection.socketPath)),
      socket = lstatSync(connection.socketPath);
    if (
      !directory.isDirectory() ||
      directory.mode & 0o077 ||
      directory.uid !== process.getuid() ||
      !socket.isSocket() ||
      socket.mode & 0o077 ||
      socket.uid !== process.getuid()
    )
      throw Error("unsafe_broker_channel");
    return http.request(
      {
        ...options,
        socketPath: connection.socketPath,
        path: new URL(connection.url).pathname,
        headers: headersFor(connection, options.headers),
      },
      callback,
    );
  }
  const request =
    transport ??
    (new URL(connection.url).protocol === "http:"
      ? http.request
      : https.request);
  return request(
    connection.url,
    {
      ...options,
      headers: headersFor(connection, options.headers),
    },
    callback,
  );
}

// Luna standard-tier estimate from native token usage. This is not a billing
// receipt. Unknown/malformed usage stays unknown; never invent a zero charge.
export function lunaUsageEstimate(usage) {
  const input = usage?.input_tokens,
    output = usage?.output_tokens;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const written = usage?.input_tokens_details?.cache_write_tokens ?? 0;
  if (
    [input, output, cached, written].some(
      (n) => !Number.isSafeInteger(n) || n < 0,
    ) ||
    cached + written > input
  )
    return null;
  const long = input > 272000;
  return (
    ((input - cached - written) * (long ? 0.2 : 0.1) +
      cached * (long ? 0.02 : 0.01) +
      written * (long ? 0.25 : 0.125) +
      output * (long ? 0.75 : 0.5)) /
    1e6
  );
}

/** Standard-tier native Responses estimate for the supported runtime choices. */
export function responsesUsageEstimate(usage, model) {
  if (model === "gpt-6-luna") return lunaUsageEstimate(usage);
  if (model !== "gpt-6.1-terra" || lunaUsageEstimate(usage) === null)
    return null;
  const input = usage.input_tokens,
    output = usage.output_tokens;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const written = usage.input_tokens_details?.cache_write_tokens ?? 0;
  const long = input > 272000;
  return (
    ((input - cached - written + cached * 0.05 + written * 1.25) *
      (long ? 2 : 1) +
      output * 5 * (long ? 1.5 : 1)) /
    1e6
  );
}
