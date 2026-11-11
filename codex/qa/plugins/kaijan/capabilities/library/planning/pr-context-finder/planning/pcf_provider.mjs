import { Agent } from "@openai/agents-core";
import { createRetainedAgentRunner } from "@katalon-experiments/ai-client/agents";
import {
  providerConnection,
  responsesUsageEstimate,
} from "@katalon-experiments/ai-client";
import { truth, finiteNonnegativeCost } from "./semantics.mjs";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import {
  encodedJson,
  parseJson,
  isJsonInteger,
  copyJsonMetadata,
  utf8,
} from "../related/json.mjs";
import {
  PlanningFailure,
  digest,
  openNew,
  readBytes,
  save,
  saveBytes,
  writeAll,
  validationDiagnostic,
} from "./pcf_records.mjs";
import {
  native,
  header,
  responseChunks,
  failureType,
  callTransport,
} from "./pcf_native.mjs";
function providerFailure(response, broker, raw) {
  const upstream = broker && header(response, "x-kaijan-provider-http-status");
  if (
    broker &&
    !(typeof upstream === "string" && /^[1-5][0-9]{2}$/.test(upstream))
  ) {
    // Older Core maps several native HTTP statuses to the same public error.
    // Keep that status in receipt.http_status without claiming it was upstream.
    return [undefined, "inference_request_rejected"];
  }
  const status = broker ? Number(upstream) : response.status;
  if (status === 401 || status === 403) return [status, "provider_auth_failed"];
  if (status === 402) return [status, "provider_quota_exhausted"];
  if (status === 429) {
    if (
      broker &&
      upstream === "429" &&
      header(response, "x-kaijan-provider-failure-code") ===
        "provider_quota_exhausted"
    )
      return [status, "provider_quota_exhausted"];
    if (
      !broker &&
      (["insufficient_quota", "organization_spend_limit_exceeded"].includes(
        raw?.error?.code,
      ) ||
        raw?.error?.type === "insufficient_quota")
    )
      return [status, "provider_quota_exhausted"];
    return [status, "provider_rate_limited"];
  }
  if (status >= 500 && status <= 599) return [status, "provider_unavailable"];
  return [status, "provider_request_rejected"];
}
export const MODEL = "gpt-6-luna",
  REASONING_EFFORT = "medium";
export function modelSettings(
  value = { model: MODEL, reasoning: REASONING_EFFORT },
) {
  if (
    !value ||
    Object.keys(value).length !== 2 ||
    !["gpt-6-luna", "gpt-6.1-terra"].includes(value.model) ||
    !["low", "medium"].includes(value.reasoning)
  )
    throw Error(
      "Supported analysis settings: gpt-6-luna or gpt-6.1-terra; low or medium reasoning",
    );
  return { model: value.model, reasoning: value.reasoning };
}
const hash = (data) => createHash("sha256").update(data).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
// Keep native validation inline. Only the outgoing schema shares repeated
// components, so evidence enums do not multiply at every application-text leaf.
export function compactRequestSchema(schema) {
  const counts = new Map();
  let hasReferences = false;
  const children = (node, visit) => {
    const result = structuredClone(node);
    for (const key of ["properties", "$defs", "definitions"])
      if (object(node[key]))
        result[key] = Object.fromEntries(
          Object.entries(node[key]).map(([name, value]) => [
            name,
            visit(value),
          ]),
        );
    for (const key of ["items", "additionalProperties", "not"])
      if (object(node[key])) result[key] = visit(node[key]);
    for (const key of ["anyOf", "oneOf", "allOf", "prefixItems"])
      if (Array.isArray(node[key])) result[key] = node[key].map(visit);
    return result;
  };
  const shareable = (node) =>
    object(node.properties) ||
    Array.isArray(node.anyOf) ||
    Array.isArray(node.enum);
  const count = (node) => {
    if (!object(node)) return node;
    // Existing reference scopes need their own resolver. Never relocate them.
    if (Object.keys(node).some((key) => key.startsWith("$")))
      hasReferences = true;
    if (shareable(node)) {
      const key = JSON.stringify(node);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    children(node, count);
    return node;
  };
  count(schema);
  if (hasReferences) return schema;
  const definitions = {},
    names = new Map();
  const compact = (node, root = false) => {
    if (!object(node)) return node;
    const key = JSON.stringify(node);
    if (!root && shareable(node) && counts.get(key) > 1) {
      let name = names.get(key);
      if (!name) {
        name = `part_${names.size}`;
        names.set(key, name);
        definitions[name] = children(node, (child) => compact(child));
      }
      return { $ref: `#/$defs/${name}` };
    }
    return children(node, (child) => compact(child));
  };
  const result = compact(schema, true);
  return Object.keys(definitions).length
    ? { ...result, $defs: definitions }
    : result;
}
export async function capture(response, file, maximum) {
  const fd = openNew(file);
  let complete = false,
    error = null,
    total = 0;
  try {
    try {
      for await (const chunk of responseChunks(response)) {
        const accepted =
          maximum === undefined
            ? chunk
            : chunk.subarray(0, Math.max(0, maximum - total));
        writeAll(fd, accepted);
        total += accepted.length;
        if (accepted.length !== chunk.length) {
          error = "response_byte_limit";
          break;
        }
      }
      if (!error) {
        const length = header(response, "Content-Length");
        if (
          length !== undefined &&
          (!/^\d+$/.test(String(length)) || Number(length) !== total)
        )
          error = "response_length_mismatch";
        else complete = true;
      }
    } catch (failure) {
      const partial = failure.partial;
      if (partial?.length) {
        const accepted =
          maximum === undefined
            ? partial
            : partial.subarray(0, Math.max(0, maximum - total));
        writeAll(fd, accepted);
        total += accepted.length;
      }
      error = failureType(failure);
    }
  } finally {
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }
  return {
    body_complete: complete,
    capture_error: error,
    captured_bytes: total,
    captured_sha256: hash(readBytes(file, maximum)),
  };
}
function outputLimit(body, max_output_tokens_limit) {
  // No application output ceiling by default. Honor an explicit caller budget;
  // the provider owns its model/context limits. Do not truncate test coverage.
  const requested = body.max_output_tokens;
  const ceiling = requested ?? max_output_tokens_limit;
  if (
    (Object.hasOwn(body, "max_output_tokens") &&
      (!Number.isSafeInteger(requested) ||
        !isJsonInteger(body, "max_output_tokens") ||
        requested < 1)) ||
    (max_output_tokens_limit !== undefined &&
      (!Number.isSafeInteger(max_output_tokens_limit) ||
        max_output_tokens_limit < 1 ||
        ceiling > max_output_tokens_limit))
  )
    throw Error("Invalid explicit output token limit");
  return ceiling;
}

// The SDK owns this Planner turn. Dispatch and validation retain their native
// records; SDK finalOutput is never substituted for the verified saved plan.
export async function generate(packet, body, root, validate, options = {}) {
  const ceiling = outputLimit(body, options.max_output_tokens_limit);
  const agent = new Agent({
    name: "Planner",
    instructions: body.instructions,
    modelSettings: {
      reasoning: body.reasoning,
      ...(ceiling === undefined ? {} : { maxTokens: ceiling }),
    },
    outputType: body.text.format,
  });
  let retained;
  const runner = createRetainedAgentRunner({
    model: body.model,
    store: body.store,
    dispatch: async (request) => {
      // The SDK represents string input as a user message and supplies
      // empty tool defaults. Verify that conversion before using the original
      // serialization for size admission, transport and the saved receipt.
      const expected = {
        ...body,
        input: [{ role: "user", content: body.input }],
        include: [],
        tools: [],
        stream: false,
        ...(ceiling === undefined ? {} : { max_output_tokens: ceiling }),
      };
      if (!isDeepStrictEqual(JSON.parse(JSON.stringify(request)), expected))
        throw new Error(
          "Planner SDK request differs from the prepared request",
        );
      const completed = await dispatchPlan(
        packet,
        body,
        root,
        validate,
        options,
      );
      retained = completed.result;
      return completed.response;
    },
  });
  // The native dispatch owner saves the caller's Stop receipt, including
  // when Stop arrives before the first transport call.
  await runner.run(agent, body.input, { maxTurns: 1 });
  if (!retained) throw new Error("Planner finished without a retained plan");
  return retained;
}

async function dispatchPlan(
  packet,
  body,
  root,
  validate,
  {
    max_request_bytes,
    max_output_tokens_limit,
    transport = native,
    env = process.env,
    signal,
    deadline_ms = 180000,
  } = {},
) {
  if (
    !Number.isInteger(deadline_ms) ||
    deadline_ms < 1 ||
    deadline_ms > 2147483647
  )
    throw Error("Invalid absolute request deadline");
  const ceiling = outputLimit(body, max_output_tokens_limit);
  const wire = utf8(
    encodedJson({
      ...body,
      ...(body.text?.format?.type === "json_schema"
        ? {
            text: {
              ...body.text,
              format: {
                ...body.text.format,
                schema: compactRequestSchema(body.text.format.schema),
              },
            },
          }
        : {}),
      ...(ceiling === undefined ? {} : { max_output_tokens: ceiling }),
    }),
  );
  if (
    max_request_bytes !== undefined &&
    (!Number.isInteger(max_request_bytes) ||
      max_request_bytes <= 0 ||
      wire.length > max_request_bytes)
  )
    throw Error("Full request byte bound exceeded");
  if (
    !object(body.reasoning) ||
    Object.keys(body.reasoning).length !== 1 ||
    !["low", "medium"].includes(body.reasoning.effort)
  )
    throw Error("Required research model and reasoning effort");
  modelSettings({ model: body.model, reasoning: body.reasoning.effort });
  const key = env.OPENAI_API_KEY;
  const connection = providerConnection(
    "https://api.openai.com/v1/responses",
    key,
    env,
  );
  fs.mkdirSync(path.dirname(root), { recursive: true });
  fs.mkdirSync(root, { mode: 0o700 });
  save(path.join(root, "input.json"), packet);
  saveBytes(path.join(root, "request.json"), wire);
  save(path.join(root, "dispatch.json"), {
    started_at: new Date().toISOString(),
    endpoint: connection.url,
    input_hash: digest(packet),
    request_sha256: hash(wire),
    wire_bytes: wire.length,
    ...(max_request_bytes === undefined ? {} : { max_request_bytes }),
    ...(ceiling === undefined ? {} : { max_output_tokens: ceiling }),
    client_attempt: 1,
    automatic_retry: false,
    absolute_deadline_ms: deadline_ms,
    socket_inactivity_timeout_ms: 180000,
  });
  const started = performance.now(),
    deadline = AbortSignal.timeout(deadline_ms),
    requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline,
    receipt = {
      status: "dispatch_started",
      started_calls: 1,
      model_requested: body.model,
      reasoning_requested: body.reasoning.effort,
      route: "OpenAI /responses",
      upstream_provider: "OpenAI",
      cost_usd: null,
      unknown_charge: true,
      unknown_usage: true,
      automatic_retry: false,
      executed_tests: false,
      absolute_deadline_ms: deadline_ms,
      socket_inactivity_timeout_ms: 180000,
      deadline_exceeded: false,
      abort_source: null,
    };
  let response,
    completedResponse,
    requestPhaseEnded = false;
  const recordAbort = () => {
    if (requestSignal.aborted) {
      receipt.deadline_exceeded =
        deadline.aborted && requestSignal.reason === deadline.reason;
      receipt.abort_source = receipt.deadline_exceeded
        ? "absolute_deadline"
        : "caller";
    }
  };
  // Record the pending completion so cleanup retains its original failure precedence.
  let nativeOperationValue, nativeOperationFailure;
  let nativeOperationFailed = false;
  try {
    nativeOperation: {
      try {
        try {
          requestSignal.throwIfAborted();
          response = await callTransport(
            transport,
            {
              url: connection.url,
              ...(connection.socketPath
                ? { socketPath: connection.socketPath }
                : {}),
              method: "POST",
              headers: {
                ...connection.headers,
                "Content-type": "application/json",
              },
              body: wire,
              inactivityTimeoutMs: 180000,
            },
            { signal: requestSignal },
          );
          receipt.http_status = response.status;
        } catch (failure) {
          if (
            failure?.constructor?.name === "FilterStopped" ||
            failure?.name === "FilterStopped"
          )
            throw failure;
          saveBytes(path.join(root, "response.bin"), Buffer.alloc(0));
          Object.assign(receipt, {
            status: "transport_error",
            body_complete: false,
            error_type: failureType(failure),
          });
          throw new PlanningFailure(
            "transport_failure_no_retry",
            root,
            receipt,
          );
        }
        Object.assign(
          receipt,
          await capture(response, path.join(root, "response.bin")),
        );
        recordAbort();
        requestPhaseEnded = true;
        if (!receipt.body_complete || receipt.capture_error) {
          receipt.status = "incomplete_capture";
          throw new PlanningFailure(
            "incomplete_capture_no_retry",
            root,
            receipt,
          );
        }
        const httpFailure = (raw) => {
          const [status, reason] = providerFailure(
            response,
            Boolean(connection.socketPath),
            raw,
          );
          if (status !== undefined) receipt.provider_http_status = status;
          receipt.status = "provider_http_failure";
          return new PlanningFailure(reason, root, receipt);
        };
        let raw;
        try {
          raw = parseJson(
            new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
              readBytes(path.join(root, "response.bin")),
            ),
          );
          if (!object(raw)) throw Error();
          const usage = object(raw.usage) ? raw.usage : {};
          const cost =
            usage.cost ??
            (!raw.service_tier || raw.service_tier === "default"
              ? responsesUsageEstimate(usage, body.model)
              : null);
          receipt.cost_basis =
            usage.cost === undefined
              ? (body.model === "gpt-6-luna" ? "Luna" : "Terra") +
                " standard-tier usage estimate, not a billing receipt"
              : "provider_reported_cost";
          if (finiteNonnegativeCost(cost)) {
            Object.assign(receipt, { cost_usd: cost, unknown_charge: false });
            copyJsonMetadata(usage, receipt, [["cost", "cost_usd"]]);
          }
          Object.assign(receipt, {
            usage,
            unknown_usage: ["input_tokens", "output_tokens"].some(
              (k) =>
                !(
                  typeof usage[k] === "bigint" ||
                  (Number.isInteger(usage[k]) && isJsonInteger(usage, k))
                ) || usage[k] < 0,
            ),
            model_returned: raw.model ?? null,
            response_id: raw.id ?? null,
            upstream_provider: "OpenAI",
          });
        } catch (error) {
          if (error?.uncaught) throw error;
          if (response.status !== 200) throw httpFailure(raw);
          receipt.status = "invalid_outer_response";
          throw new PlanningFailure(
            "invalid_outer_response_no_retry",
            root,
            receipt,
          );
        }
        save(path.join(root, "usage-receipt.json"), receipt);
        if (response.status !== 200) throw httpFailure(raw);
        if (
          receipt.http_status === 200 &&
          raw.model === body.model &&
          !truth(raw.error) &&
          raw.status === "incomplete" &&
          raw.incomplete_details?.reason === "max_output_tokens"
        ) {
          receipt.status = "output_limit";
          receipt.failure_diagnostic = {
            stage: "response_completion",
            reason: "max_output_tokens",
            max_output_tokens: ceiling ?? null,
          };
          throw new PlanningFailure(
            "provider_output_limit_no_retry",
            root,
            receipt,
          );
        }
        if (
          raw.status !== "completed" ||
          truth(raw.error) ||
          raw.model !== body.model
        ) {
          receipt.status = "http_identity_or_completion_failure";
          throw new PlanningFailure(
            "invalid_first_response_no_retry",
            root,
            receipt,
          );
        }
        let candidate, checks, text;
        let failureStage = "response_parsing";
        try {
          text = (raw.output ?? [])
            .filter((o) => o.type === "message")
            .flatMap((o) =>
              (o.content ?? [])
                .filter((c) => c.type === "output_text")
                .map((c) => {
                  if (typeof c.text !== "string") throw Error();
                  return c.text;
                }),
            )
            .join("");
          candidate = parseJson(text);
          save(path.join(root, "candidate.json"), candidate);
          const before = digest(candidate);
          failureStage = "plan_validation";
          checks = await validate(candidate);
          if (digest(candidate) !== before)
            throw Error("Validator changed original candidate");
          save(path.join(root, "validation.json"), checks);
        } catch (failure) {
          if (typeof failure?.syscall === "string") throw failure;
          receipt.failure_diagnostic = {
            stage: failureStage,
            error_name: typeof failure?.name === "string" ? failure.name : null,
            message:
              typeof failure?.message === "string"
                ? failure.message
                : typeof failure === "string"
                  ? failure
                  : null,
          };
          const context = validationDiagnostic(failure);
          if (context) receipt.failure_diagnostic.validation = context;
          receipt.status = "invalid_first_plan";
          throw new PlanningFailure(
            "invalid_first_plan_no_repair",
            root,
            receipt,
          );
        }
        // Give the SDK the exact text accepted by the native reader. The
        // retained response can split it across messages or omit message metadata.
        completedResponse = {
          ...JSON.parse(
            readBytes(path.join(root, "response.bin")).toString("utf8"),
          ),
          // Native validation treats empty error containers as no error.
          error: null,
          output: [
            {
              type: "message",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text }],
            },
          ],
        };
        const validity =
          checks.coverage?.status === "partial"
            ? "valid_partial_plan"
            : "valid_plan";
        receipt.status =
          !receipt.unknown_charge && !receipt.unknown_usage
            ? validity
            : validity + "_unknown_accounting";
        {
          nativeOperationValue = {
            plan: candidate,
            checks,
            input_hash: digest(packet),
            receipt_directory: String(root),
            receipt,
          };
          break nativeOperation;
        }
      } catch (failure) {
        if (failure instanceof PlanningFailure) throw failure;
        if (typeof failure.syscall === "string") {
          receipt.status = "persistence_failure";
          throw new PlanningFailure(
            "persistence_failure_no_retry",
            root,
            receipt,
          );
        }
        throw failure;
      }
    }
  } catch (error) {
    nativeOperationFailed = true;
    nativeOperationFailure = error;
  }
  {
    if (!requestPhaseEnded) recordAbort();
    if (response)
      try {
        await response.close?.();
      } catch {
        receipt.response_close_error = true;
      }
    receipt.elapsed_seconds = (performance.now() - started) / 1000;
    try {
      save(path.join(root, "receipt.json"), receipt);
    } catch {
      throw new PlanningFailure(
        "receipt_persistence_failure_no_retry",
        root,
        receipt,
      );
    }
  }
  if (nativeOperationFailed) throw nativeOperationFailure;
  return { result: nativeOperationValue, response: completedResponse };
}
