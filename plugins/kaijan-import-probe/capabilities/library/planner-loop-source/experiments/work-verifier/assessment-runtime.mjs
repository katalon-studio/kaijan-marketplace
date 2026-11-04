// Shared one-call assessment transport. Preparation and projection are supplied together.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { LIMITS, SUPPLIED_ASSESSMENT } from "./assessment-contract.mjs";
import { generate } from "../context-finder/planning/pcf_provider.mjs";
import { native } from "../context-finder/planning/pcf_native.mjs";
import { save } from "../context-finder/planning/pcf_records.mjs";
import { sourceScreen } from "../context-finder/related/source-screen.mjs";
import { providerConnection } from "../provider-transport/index.mjs";
import {
  encodedJson,
  parseJson,
  utf8,
} from "../context-finder/related/json.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function assessPreparedSuppliedEvidence(
  prepared,
  {
    archive,
    env = process.env,
    signal,
    transport,
    shouldStop = () => false,
    deadline_ms = LIMITS.deadlineMs,
  } = {},
  projectAssessment,
) {
  assert(
    path.isAbsolute(archive ?? ""),
    "New absolute assessment archive required",
  );
  assert(
    Number.isInteger(deadline_ms) &&
      deadline_ms > 0 &&
      deadline_ms <= LIMITS.deadlineMs,
  );
  signal?.throwIfAborted();
  assert(!shouldStop(), "Caller Stop before effect");
  await sourceScreen(env, signal)(prepared.input);
  await sourceScreen(env, signal)(prepared.request);
  fs.mkdirSync(archive, { mode: 0o700 });
  save(path.join(archive, "prepared.json"), prepared);
  const nativeRoot = path.join(archive, "native");
  let result = null,
    failure = null,
    receipt,
    calls = 0;
  const wire = utf8(encodedJson(prepared.request));
  const syncNative = () => {
    const files = [];
    for (const name of fs.readdirSync(nativeRoot)) {
      const file = path.join(nativeRoot, name),
        info = fs.lstatSync(file);
      assert(
        info.isFile() && !info.isSymbolicLink(),
        "Regular native artifacts required",
      );
      const fd = fs.openSync(file, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      const bytes = fs.readFileSync(file);
      files.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
    }
    for (const dir of [nativeRoot, archive]) {
      const fd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    }
    return files;
  };
  const guardedTransport = async (request, options) => {
    assert(!shouldStop(), "Caller Stop before dispatch");
    options.signal?.throwIfAborted();
    assert.equal(calls, 0, "One assessment call, no retry");
    assert.equal(request.method, "POST");
    assert.equal(
      request.url,
      providerConnection(
        "https://api.openai.com/v1/responses",
        env.OPENAI_API_KEY,
        env,
      ).url,
    );
    assert(
      Buffer.from(request.body).equals(wire),
      "Exact assessment request changed",
    );
    const dispatch = parseJson(
      fs.readFileSync(path.join(nativeRoot, "dispatch.json"), "utf8"),
    );
    assert.equal(dispatch.request_sha256, prepared.request_sha256);
    assert.equal(dispatch.absolute_deadline_ms, deadline_ms);
    syncNative();
    calls++;
    return (transport ?? native)(request, options);
  };
  const started = performance.now();
  try {
    result = await generate(
      prepared.input,
      prepared.request,
      nativeRoot,
      (candidate) => projectAssessment(prepared, candidate),
      {
        env,
        signal,
        transport: guardedTransport,
        deadline_ms,
        max_output_tokens_limit: LIMITS.outputTokens,
      },
    );
    receipt = result.receipt;
  } catch (error) {
    receipt = error.receipt ?? null;
    failure = {
      reason:
        typeof error.reason === "string"
          ? error.reason
          : "assessment_failed_no_retry",
      ...(error.reason === "provider_output_limit_no_retry"
        ? {
            code: "assessment_output_limit",
            message:
              "The assessment reached its response limit before it finished. No new test result was produced.",
            max_output_tokens: prepared.request.max_output_tokens,
            next_action: {
              kind: "review_assessment_scope",
              instruction:
                "Keep the earlier assessment and original evidence. Do not repeat the same request automatically. Prepare a focused assessment for one test or related check, including its full requirements, outcomes and relevant evidence. Keep omitted checks pending. If this is already one check or cannot be separated without losing context, report the limit for a larger-response assessment; do not drop evidence to obtain a verdict.",
            },
          }
        : {}),
    };
  }
  const assessment = result ? projectAssessment(prepared, result.plan) : null;
  const output = {
    schema: SUPPLIED_ASSESSMENT,
    ...(prepared.request_representation
      ? { request_representation: prepared.request_representation }
      : {}),
    status: result ? "returned_assessment" : "first_response_failure",
    input_sha256: prepared.input_sha256,
    request_sha256: prepared.request_sha256,
    assessment,
    native_receipt: receipt,
    failure,
    native_artifact_directory: nativeRoot,
    complete_call_elapsed_seconds: (performance.now() - started) / 1000,
    provider_calls_started: calls,
    native_artifacts: [],
    result_persisted: false,
    continuation_allowed: false,
    limitations:
      "Supplied reports and evidence are unauthenticated. Exact citations and record membership do not establish semantic truth, target execution or acceptance. Internal native transport labels retain historical planner wording.",
  };
  try {
    if (calls) {
      output.native_artifacts = syncNative();
      assert.equal(
        encodedJson(
          parseJson(
            fs.readFileSync(path.join(nativeRoot, "receipt.json"), "utf8"),
          ),
        ),
        encodedJson(receipt),
        "Native receipt readback mismatch",
      );
      assert(
        fs.existsSync(path.join(nativeRoot, "response.bin")),
        "Original first response missing",
      );
    }
    output.continuation_allowed = Boolean(
      calls === 1 &&
      receipt &&
      receipt.unknown_charge === false &&
      receipt.unknown_usage === false &&
      receipt.model_returned === prepared.request.model &&
      receipt.body_complete === true &&
      receipt.status !== "persistence_failure" &&
      ![
        "persistence_failure_no_retry",
        "receipt_persistence_failure_no_retry",
      ].includes(failure?.reason),
    );
    output.result_persisted = true;
    save(path.join(archive, "result.json"), output);
    const bytes = fs.readFileSync(path.join(archive, "result.json"));
    assert.equal(
      encodedJson(parseJson(bytes.toString("utf8"))),
      encodedJson(output),
    );
    for (const dir of [nativeRoot, archive]) {
      const fd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    }
  } catch {
    output.continuation_allowed = false;
    output.result_persisted = false;
    output.persistence_failure = true;
  }
  return output;
}
