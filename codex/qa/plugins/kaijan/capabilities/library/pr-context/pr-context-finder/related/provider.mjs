import { createHash } from "node:crypto";
import {
  providerConnection,
  lunaUsageEstimate,
  requestHttp,
} from "@katalon-experiments/ai-client";
import fs from "node:fs";
import { Buffer } from "node:buffer";
import { performance } from "node:perf_hooks";
import { check, hash, RelatedError } from "./records.mjs";

export function providerConfig(env) {
  check(
    Boolean(env.LOKI_AUTH_BROKER_SOCKET || env.OPENAI_API_KEY),
    "provider_unavailable",
  );
  return {
    key: env.OPENAI_API_KEY,
    ...providerConnection(
      "https://api.openai.com/v1/responses",
      env.OPENAI_API_KEY,
      env,
    ),
  };
}

export async function evaluate(
  request,
  config,
  store,
  signal,
  receipt,
  transport,
) {
  const body = Buffer.from(JSON.stringify(request));
  signal.throwIfAborted();
  store.write("request.json", body);
  const fd = store.openResponse();
  const started = performance.now();
  receipt.request_sha256 = hash(body);
  receipt.model = request.model;
  receipt.route = config.url ?? "https://api.openai.com/v1/responses";
  receipt.started_at = new Date().toISOString();
  const chunks = [];
  const responseHash = createHash("sha256");
  receipt.body_complete = false;
  let length = 0;
  let storageError = false;
  let result;
  try {
    // Persist intent first. A process loss after this marker requires reconciliation, not retry.
    store.write("dispatch.json", { ...receipt, dispatch_intent: true });
    receipt.calls = 1;
    receipt.unknown_cost_calls = 1;
    receipt.unknown_usage_calls = 1;
    result = await new Promise((resolve, reject) => {
      let response;
      let settled = false;
      const fail = (code) => {
        if (settled) return;
        settled = true;
        reject(new RelatedError(code));
      };
      const req = requestHttp(
        {
          url: receipt.route,
          ...(config.socketPath ? { socketPath: config.socketPath } : {}),
          headers: config.headers ?? { Authorization: `Bearer ${config.key}` },
        },
        {
          method: "POST",
          signal,
          headers: {
            ...(config.headers ?? { Authorization: `Bearer ${config.key}` }),
            "Content-Type": "application/json",
            "Content-Length": body.length,
            "Accept-Encoding": "identity",
          },
        },
        (res) => {
          response = res;
          receipt.http_status = res.statusCode;
          res.on("data", (chunk) => {
            if (settled) return;
            chunks.push(chunk);
            length += chunk.length;
            responseHash.update(chunk);
            try {
              fs.writeFileSync(fd, chunk);
            } catch {
              storageError = true;
            }
          });
          res.on("aborted", () => fail("response_incomplete"));
          res.on("error", () => fail("response_incomplete"));
          res.on("end", () => {
            if (settled) return;
            if (!res.complete) {
              fail("response_incomplete");
              return;
            }
            const claimed = res.headers["content-length"];
            if (
              claimed !== undefined &&
              (!/^\d+$/.test(String(claimed)) || Number(claimed) !== length)
            ) {
              fail("response_length_mismatch");
              return;
            }
            settled = true;
            receipt.body_complete = true;
            resolve({
              bytes: Buffer.concat(chunks),
              encoding: res.headers["content-encoding"],
            });
          });
        },
        transport,
      );
      req.on("error", () => {
        response?.destroy();
        fail(signal.aborted ? "stopped" : "provider_transport_error");
      });
      req.end(body);
    });
    receipt.response_bytes = length;
    receipt.response_sha256 = hash(result.bytes);
    check(
      !result.encoding || result.encoding === "identity",
      "unsupported_response_encoding",
    );
    let parsed;
    try {
      parsed = JSON.parse(result.bytes.toString("utf8"));
    } catch {
      throw new RelatedError("invalid_provider_json");
    }
    receipt.response_id = typeof parsed.id === "string" ? parsed.id : null;
    receipt.returned_model =
      typeof parsed.model === "string" ? parsed.model : null;
    receipt.usage = parsed.usage ?? null;
    receipt.unknown_usage_calls = Number(
      !["input_tokens", "output_tokens"].every(
        (key) =>
          Number.isSafeInteger(parsed.usage?.[key]) && parsed.usage[key] >= 0,
      ),
    );
    const cost =
      parsed.usage?.cost ??
      (!parsed.service_tier || parsed.service_tier === "default"
        ? lunaUsageEstimate(parsed.usage)
        : null);
    if (typeof cost === "number" && Number.isFinite(cost) && cost >= 0) {
      receipt.known_cost_usd = cost;
      receipt.unknown_cost_calls = 0;
      receipt.cost_basis =
        parsed.usage?.cost === undefined || parsed.usage?.cost === null
          ? "Luna standard-tier usage estimate, not a billing receipt"
          : "provider_reported_cost";
    }
    check(!storageError, "response_storage_failed");
    check(receipt.http_status === 200, "provider_http_error");
    return parsed;
  } finally {
    receipt.elapsed_ms = Math.round(performance.now() - started);
    receipt.response_sha256 = responseHash.digest("hex");
    receipt.response_bytes = length;
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    // The caller also prints this in its bounded safe result if a later write fails.
  }
}
