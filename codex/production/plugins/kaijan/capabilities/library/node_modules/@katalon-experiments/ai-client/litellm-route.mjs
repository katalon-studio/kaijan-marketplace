// Shared native provider connection policy.
// This module selects transport only: it never reads or changes a model body.
export class AiClientError extends Error {
  constructor(code) {
    super(code);
    this.name = "AiClientError";
    this.code = code;
  }
}
const validBinding = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Retained managed conversations cannot use the legacy unbound route. */
export function requireManagedBinding(env = {}) {
  if (
    env.LOKI_AUTH_BROKER_SOCKET &&
    !validBinding(env.LOKI_AI_CONNECTION_BINDING)
  )
    throw new AiClientError("managed_connection_binding_required");
}

export function providerConnection(nativeUrl, key, env = {}) {
  let native;
  try {
    native = new URL(nativeUrl);
  } catch {
    throw new AiClientError("unsupported_native_route");
  }
  if (native.username || native.password || native.search || native.hash)
    throw new AiClientError("unsupported_native_route");
  const count =
    native.origin === "https://api.openai.com" &&
    native.pathname === "/v1/responses/input_tokens";
  if (
    count &&
    (!env.LOKI_AUTH_BROKER_SOCKET ||
      !validBinding(env.LOKI_AI_CONNECTION_BINDING))
  )
    throw new AiClientError("managed_count_binding_required");
  const openai =
    native.origin === "https://api.openai.com" &&
    [
      "/v1/responses",
      "/v1/responses/input_tokens",
      "/v1/models/gpt-6-luna",
    ].includes(native.pathname);
  const jev =
    native.origin === "https://openrouter.ai" &&
    (native.pathname === "/api/v1/systemone" ||
      /^\/api\/v1\/models\/typesafe\/jev[^?#]*\/endpoints$/.test(
        native.pathname,
      ));
  if (!openai && !jev) throw new AiClientError("unsupported_native_route");
  if (env.LOKI_AUTH_BROKER_SOCKET) {
    if (env.LOKI_AI_CONNECTION_BINDING !== undefined)
      requireManagedBinding(env);
    if (
      typeof env.LOKI_AUTH_BROKER_SOCKET !== "string" ||
      !env.LOKI_AUTH_BROKER_SOCKET.startsWith("/") ||
      env.LOKI_AUTH_BROKER_SOCKET.length > 103
    )
      throw new AiClientError("invalid_broker_channel");
    const path =
      native.pathname === "/v1/responses"
        ? "/v1/responses"
        : openai
          ? `/openai_passthrough${native.pathname}`
          : `/openrouter${native.pathname.slice(4)}`;
    return {
      url: `http://localhost/${env.LOKI_AI_CONNECTION_BINDING ? "ai-bound" : "ai"}${path}`,
      headers: Object.fromEntries(
        [
          ["x-loki-plan-id", env.LOKI_TELEMETRY_PLAN_ID],
          ["x-loki-run-id", env.LOKI_TELEMETRY_RUN_ID],
          ["x-kaijan-ai-connection", env.LOKI_AI_CONNECTION_BINDING],
        ].filter(([name, value]) =>
          name === "x-kaijan-ai-connection"
            ? validBinding(value)
            : typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
        ),
      ),
      socketPath: env.LOKI_AUTH_BROKER_SOCKET,
    };
  }
  if (env.LOKI_AI_CONNECTION_BINDING !== undefined)
    throw new AiClientError("connection_binding_requires_broker");
  if (typeof key !== "string" || !key.trim())
    throw new AiClientError("provider_key_required");
  // Native OpenAI and JEV destinations are fixed. Legacy gateway flags cannot
  // redirect a request or exchange either provider's credentials.
  return { url: native.href, headers: { Authorization: `Bearer ${key}` } };
}
