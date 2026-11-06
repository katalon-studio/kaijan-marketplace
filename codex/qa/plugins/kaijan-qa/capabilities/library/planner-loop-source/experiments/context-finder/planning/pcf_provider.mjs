import {
  providerConnection,
  responsesUsageEstimate,
} from "@katalon-experiments/ai-client";
import { truth, finiteNonnegativeCost } from "./semantics.mjs";
import fs from "node:fs";
import path from "node:path";
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
export async function generate(
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
  const wire = utf8(
    encodedJson({
      ...body,
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
          receipt.status = "invalid_outer_response";
          throw new PlanningFailure(
            "invalid_outer_response_no_retry",
            root,
            receipt,
          );
        }
        save(path.join(root, "usage-receipt.json"), receipt);
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
          receipt.http_status !== 200 ||
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
        let candidate, checks;
        let failureStage = "response_parsing";
        try {
          const text = (raw.output ?? [])
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
  return nativeOperationValue;
}
