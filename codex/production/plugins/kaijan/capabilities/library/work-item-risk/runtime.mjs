import {
  AiClientError,
  responsesUsageEstimate,
  providerConnection,
  sendFetch,
} from "@katalon-experiments/ai-client";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  RiskError,
  SCHEMA,
  VERSION,
  LIMITS,
  sha256,
  evaluate,
  preflight,
  modeConfig,
  initialCoverage,
  MODES,
  snapshotProvenance,
  nonHunkEvidence,
} from "./method.mjs";

const BASE_URL = "https://api.openai.com/v1";

// Only standard error fields belong in the private diagnostic. Never enumerate
// an exception's request, headers, configuration, response or other custom data.
function standardFailure(value, key, seen = new Set()) {
  const safe = (text) => {
    if (typeof text !== "string") return null;
    for (const secret of (Array.isArray(key) ? key : [key]).filter(Boolean))
      text = text.split(secret).join("[REDACTED]");
    return text
      .replace(/\b(Bearer|Basic)\s+[^\s"',}]+/gi, "$1 [REDACTED]")
      .replace(/(\bauthorization["']?\s*[:=]\s*)[^\r\n]+/gi, "$1[REDACTED]");
  };
  if (value === null || typeof value !== "object")
    return { error_name: null, message: safe(value), code: null };
  if (seen.has(value)) return { circular_cause: true };
  seen.add(value);
  const result = {
    error_name: safe(value.name),
    message: safe(value.message),
    code:
      typeof value.code === "string"
        ? safe(value.code)
        : Number.isFinite(value.code)
          ? value.code
          : null,
  };
  if (value.cause !== undefined)
    result.cause = standardFailure(value.cause, key, seen);
  return result;
}

export async function createArchive(root) {
  const base = root ?? path.join(homedir(), ".cache", "change-risk-finder");
  await mkdir(base, { recursive: true, mode: 0o700 });
  return mkdtemp(path.join(base, "run-"));
}

async function captureResponse(response) {
  const parts = [];
  let failed = false,
    failure;
  try {
    for await (const part of response.body) parts.push(Buffer.from(part));
  } catch (error) {
    failed = true;
    failure = error;
    if (error?.partial?.length) parts.push(Buffer.from(error.partial));
  }
  const bytes = Buffer.concat(parts);
  const length = response.headers?.get?.("content-length");
  if (
    !failed &&
    length !== null &&
    length !== undefined &&
    (!/^\d+$/.test(String(length)) || Number(length) !== bytes.length)
  ) {
    failed = true;
    failure = new RiskError("response_length_mismatch");
  }
  return { bytes, failed, failure };
}

export async function run(packet, options) {
  return runWithMethod(packet, options, {
    config: modeConfig(options.mode),
    preflight,
    evaluate: (packet, context) =>
      evaluate(packet, {
        ...context,
        resolveApplicationSpan: options.resolveApplicationSpan,
      }),
    schema: SCHEMA,
    invocation: invocationRecord,
  });
}

// Research entrypoints can reuse archival transport without changing CLI modes.
export async function runWithMethod(
  packet,
  {
    template,
    archive,
    env = process.env,
    signal,
    fetcher = fetch,
    beforeDispatch,
    mode,
  },
  method,
) {
  const selected = { ...method.config };
  if (
    !Number.isSafeInteger(selected.max_calls) ||
    selected.max_calls < 1 ||
    selected.max_calls > 6
  )
    throw new RiskError("invalid_method_call_bound");
  const modeSelection = mode === undefined ? "default" : "explicit";
  const ledger = [];
  const recovery = [];
  const failureDiagnostics = [];
  let diagnosticStage = "preflight",
    diagnosticContext,
    diagnosedFailure;
  const started = performance.now();
  const key = env.OPENAI_API_KEY;
  const keys = [
    key,
    env.LOKI_OPENROUTER_API_KEY,
    env.OPENROUTER_API_KEY,
  ].filter(Boolean);
  const save = async (name, value, exclusive = true) => {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n";
    if (keys.some((secret) => text.includes(secret)))
      throw new RiskError("credential_in_artifact");
    await writeFile(path.join(archive, name), text, {
      flag: exclusive ? "wx" : "w",
      mode: 0o600,
    });
  };
  let admitted = false;
  const result = {
    schema: method.schema,
    version: VERSION,
    method: selected.method,
    mode: selected.mode,
    mode_selection: modeSelection,
    question_limit: LIMITS.questions,
    coverage_details: initialCoverage(selected.mode),
    status: "partial",
    source:
      packet?.source?.kind === "provided-snapshot"
        ? null
        : (packet?.source ?? null),
    coverage: packet?.coverage ?? null,
    packet_sha256: sha256(JSON.stringify(packet)),
    assumptions_to_confirm: [],
    risk_selections: [],
    limitations:
      "Questions are unresolved model-authored assumptions, not verified defects. Empty output is not a safety verdict. Source citations require verification. No tests are proposed or executed. Only the supplied patch/context is available; this is not full-repository coverage.",
    ledger,
    artifact_directory: archive,
  };
  try {
    method.preflight(packet, template, selected.mode);
    admitted = true;
    const provenance = snapshotProvenance(packet);
    if (provenance) {
      result.source = packet.source;
      result.source_provenance = provenance;
      result.coverage_details.source_context = "supplied_snapshot_contents";
    }
    diagnosticStage = "provider_configuration";
    if (
      (!env.LOKI_AUTH_BROKER_SOCKET && !key) ||
      (selected.mode !== "direct" &&
        selected.mode !== "work-item" &&
        !env.LOKI_AUTH_BROKER_SOCKET &&
        !(env.LOKI_OPENROUTER_API_KEY ?? env.OPENROUTER_API_KEY))
    )
      throw new RiskError("provider_not_configured");
    diagnosticStage = "input_archive";
    await save("packet.json", packet);
    await save("method.json", {
      method: result.method,
      mode: selected.mode,
      mode_selection: modeSelection,
      template,
      limits: LIMITS,
      retries: 0,
    });
    const call = async (stage, route, request) => {
      if (
        route === "responses" &&
        (!["gpt-6-luna", "gpt-6.1-terra"].includes(request.model) ||
          !["low", "medium"].includes(request.reasoning?.effort))
      )
        throw new RiskError("unsupported_analysis_model_settings");
      if (ledger.length >= selected.max_calls)
        throw new RiskError("call_limit");
      if (signal?.aborted) throw new RiskError("cancelled");
      const wire = JSON.stringify(request);
      await save(stage + ".request.json", wire);
      const row = {
        stage,
        provider: route === "systemone" ? "openrouter" : "openai",
        route: "/" + route,
        requested_model: request.model,
        ...(request.reasoning
          ? { requested_reasoning: request.reasoning.effort }
          : {}),
        request_sha256: sha256(wire),
        started_utc: new Date().toISOString(),
        status: "dispatched",
        cost_usd: null,
        returned_model: null,
      };
      ledger.push(row);
      // If this write fails no request has started. Do not claim an uncertain paid dispatch.
      try {
        await save("ledger.json", ledger, false);
      } catch {
        row.status = "not_dispatched";
        throw new RiskError("archive_write_failed");
      }
      const callStart = performance.now();
      // Record the pending completion so cleanup retains its original failure precedence.
      let nativeOperationValue, nativeOperationFailure;
      let nativeOperationFailed = false;
      let requestDeadline;
      try {
        nativeOperation: {
          try {
            diagnosticStage = "provider_dispatch";
            const target =
              route === "systemone"
                ? providerConnection(
                    "https://openrouter.ai/api/v1/systemone",
                    env.LOKI_OPENROUTER_API_KEY ?? env.OPENROUTER_API_KEY,
                    env,
                  )
                : providerConnection(BASE_URL + "/responses", key, env);
            requestDeadline = AbortSignal.timeout(120000);
            const requestOptions = {
              method: "POST",
              redirect: "error",
              headers: {
                ...target.headers,
                "Content-Type": "application/json",
              },
              body: wire,
              signal: AbortSignal.any([
                requestDeadline,
                ...(signal ? [signal] : []),
              ]),
            };
            // Admission and durable-ledger checks apply to every transport,
            // including broker sockets which do not use the injected fetcher.
            try {
              await beforeDispatch?.(target.url, requestOptions);
            } catch (error) {
              row.status = "not_dispatched";
              throw error;
            }
            const response = await sendFetch(target, requestOptions, fetcher);
            row.http_status = response.status;
            diagnosticStage = "response_capture";
            const captured = await captureResponse(response);
            row.response_sha256 = sha256(captured.bytes);
            const preservation = {
              http_status: response.status,
              captured_bytes: captured.bytes.length,
              captured_sha256: row.response_sha256,
              body_complete: !captured.failed,
              original_preserved: false,
            };
            if (
              keys.some((secret) =>
                captured.bytes.includes(Buffer.from(secret)),
              )
            ) {
              await save(stage + ".response-preservation.json", {
                ...preservation,
                reason: "credential_in_artifact",
              });
              throw new RiskError("credential_in_artifact");
            }
            let raw, decodingFailure, body;
            try {
              raw = new TextDecoder("utf-8", {
                fatal: true,
                ignoreBOM: true,
              }).decode(captured.bytes);
            } catch (error) {
              decodingFailure = error;
            }
            if (!captured.failed && !decodingFailure) {
              try {
                body = JSON.parse(raw);
              } catch {
                /* First bytes remain evidence even for non-JSON. */
              }
              row.returned_model =
                typeof body?.model === "string" ? body.model : null;
              row.usage = body?.usage ?? null;
              if (Number.isFinite(body?.usage?.cost) && body.usage.cost >= 0)
                row.cost_usd = body.usage.cost;
              if (
                route === "responses" &&
                row.cost_usd === null &&
                (!body?.service_tier || body.service_tier === "default")
              ) {
                row.cost_usd = responsesUsageEstimate(
                  body?.usage,
                  request.model,
                );
                row.cost_basis =
                  (request.model === "gpt-6-luna" ? "Luna" : "Terra") +
                  " standard-tier usage estimate, not a billing receipt";
              }
              row.status = "response";
            }
            diagnosticStage = "response_archive";
            try {
              await writeFile(
                path.join(archive, stage + ".response.bin"),
                captured.bytes,
                { flag: "wx", mode: 0o600 },
              );
              preservation.original_preserved = true;
              await save(stage + ".response-preservation.json", preservation);
            } catch (error) {
              if (
                !captured.failed &&
                !decodingFailure &&
                !keys.some((secret) => raw.includes(secret))
              )
                recovery.push({ stage, raw_response: raw });
              const failure = new RiskError("response_archive_failed");
              failure.cause = error;
              throw failure;
            }
            if (captured.failed) throw captured.failure;
            diagnosticStage = "response_parsing";
            if (decodingFailure) throw decodingFailure;
            // Account before persistence, so a failed artifact write cannot erase a known charge.
            diagnosticStage = "response_archive";
            try {
              await save(stage + ".response.json", raw);
            } catch {
              if (!keys.some((secret) => raw.includes(secret)))
                recovery.push({ stage, raw_response: raw });
              throw new RiskError("response_archive_failed");
            }
            diagnosticStage = "response_validation";
            if (!response.ok) throw new RiskError("provider_http_error");
            if (!body) throw new RiskError("provider_invalid_json");
            diagnosticStage = "method_evaluation";
            {
              nativeOperationValue = body;
              break nativeOperation;
            }
          } catch (failure) {
            try {
              failureDiagnostics.push({
                stage: diagnosticStage,
                call_stage: stage,
                ...standardFailure(failure, keys),
              });
            } catch {
              /* Diagnostics cannot replace the original failure. */
            }
            const timeout =
              diagnosticStage === "provider_dispatch" &&
              row.status === "dispatched" &&
              (requestDeadline?.aborted ||
                (failure instanceof DOMException &&
                  failure.name === "TimeoutError"));
            row.error_code =
              failure instanceof RiskError
                ? failure.code
                : signal?.aborted
                  ? "cancelled"
                  : timeout
                    ? "provider_timeout"
                    : "provider_transport_error";
            if (row.status === "dispatched") row.status = "uncertain";
            diagnosedFailure = new RiskError(row.error_code);
            throw diagnosedFailure;
          }
        }
      } catch (error) {
        nativeOperationFailed = true;
        nativeOperationFailure = error;
      }
      {
        row.elapsed_seconds = Number(
          ((performance.now() - callStart) / 1000).toFixed(3),
        );
        try {
          await save("ledger.json", ledger, false);
        } catch {
          row.receipt_write_failed = true;
        }
        // Opt-in compound methods must stop before their next stage when the
        // just-completed call has unknown fees or an unpersisted receipt.
        // Existing methods retain their recorded accounting behavior.
        if (
          method.stopOnAccountingGap === true &&
          !row.error_code &&
          (row.cost_usd === null || row.receipt_write_failed)
        )
          throw new RiskError("accounting_incomplete");
      }
      if (nativeOperationFailed) throw nativeOperationFailure;
      return nativeOperationValue;
    };
    diagnosticStage = "method_evaluation";
    const output = await method.evaluate(packet, {
      template,
      call,
      mode: selected.mode,
      onProgress: (partial) => Object.assign(result, partial),
      onDiagnosticStage: (stage, context) => {
        diagnosticStage = stage;
        diagnosticContext = context;
      },
    });
    Object.assign(result, output);
    result.limitations +=
      " " +
      "Questions are not verified defects. Empty output is not a safety verdict. Supplied files/patches are not full-repository coverage. No tests are proposed or executed. Source citations are model-authored and have not been independently verified. Probabilities are uncalibrated when present.";
    if (
      ledger.some((row) => row.cost_usd === null || row.receipt_write_failed)
    ) {
      result.status = "partial";
      result.error_code = "accounting_incomplete";
    }
  } catch (failure) {
    if (failure !== diagnosedFailure) {
      try {
        failureDiagnostics.push({
          stage: diagnosticStage,
          ...(diagnosticContext ? { validation: diagnosticContext } : {}),
          ...standardFailure(failure, keys),
        });
      } catch {
        /* Preserve public status/accounting even for unusual exceptions. */
      }
    }
    result.error_code =
      failure instanceof RiskError || failure instanceof AiClientError
        ? failure.code
        : "execution_failed";
    if (failure instanceof RiskError && failure.details)
      result.error_details = failure.details;
    result.status = ledger.length ? "partial" : "refused";
  }
  if (admitted) {
    const files = nonHunkEvidence(packet);
    if (files.length) {
      result.coverage_details.non_hunk_files = files;
      if (result.coverage_details.source_context === "supplied_patch_only")
        result.coverage_details.source_context = packet.files.some(
          (f) => typeof f.patch === "string" && f.patch.length,
        )
          ? "supplied_patch_and_file_metadata"
          : "supplied_file_metadata_only";
      result.limitations +=
        " File metadata has no textual hunk/line anchor. Reported zero deltas are not verified byte equality; unavailable text and unassessed metadata remain coverage gaps.";
      const unavailable = files.some((f) => f.text_evidence === "unavailable");
      if (
        (unavailable || selected.mode === "guided") &&
        ["completed", "no_retained_cue"].includes(result.status)
      ) {
        result.status = "partial";
        result.error_code ??= unavailable
          ? "text_evidence_unavailable"
          : "non_hunk_changes_unassessed";
      }
    }
  }
  result.accounting = {
    calls_started: ledger.filter((row) => row.status !== "not_dispatched")
      .length,
    known_cost_usd: ledger.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0),
    unknown_cost_calls: ledger.filter(
      (row) => row.status !== "not_dispatched" && row.cost_usd === null,
    ).length,
    elapsed_seconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    execution: `Sequential calls, at most ${selected.max_calls}, zero retries. Known values include labeled OpenAI token-usage estimates, not billing receipts; unknown charges and agent/GitHub effort are excluded.`,
  };
  if (recovery.length) result.recovery = recovery;
  // Provider bodies are untrusted, including usage metadata. Never print an echoed credential.
  if (keys.some((secret) => JSON.stringify(result).includes(secret))) {
    let text = JSON.stringify(result);
    for (const secret of keys) text = text.split(secret).join("[REDACTED]");
    Object.assign(result, JSON.parse(text), {
      status: "partial",
      error_code: "credential_in_provider_output",
    });
  }
  result.invocation = method.invocation(result);
  if (failureDiagnostics.length) {
    try {
      await save("failure-diagnostics.json", { failures: failureDiagnostics });
    } catch {
      /* An optional private diagnostic must not change result semantics. */
    }
  }
  try {
    await save("result.json", result);
  } catch {
    result.status = "partial";
    result.error_code = "result_archive_failed";
    result.invocation = method.invocation(result);
  }
  return result;
}

// Allowlist only: no packet identity, source, question, prompt, native usage or freeform provider text.
export function invocationRecord(result) {
  return {
    schema: "change-risk-finder/invocation/1",
    version: result.version,
    available_modes: [...MODES],
    selected_mode: result.mode,
    selection: result.mode_selection,
    method: result.method,
    status: result.status,
    error_code: result.error_code ?? null,
    calls_started: result.accounting.calls_started,
    known_cost_usd: result.accounting.known_cost_usd,
    unknown_cost_calls: result.accounting.unknown_cost_calls,
    elapsed_seconds: result.accounting.elapsed_seconds,
  };
}
