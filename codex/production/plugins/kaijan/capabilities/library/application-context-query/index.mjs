import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setImmediate as yieldTurn } from "node:timers/promises";
import { readLocalBytes } from "../source-adapters/index.mjs";
import {
  snapshotJson,
  jsonTextChunkEnd,
} from "../component-contracts/index.mjs";
import { QueryStore, identity, sha256 } from "./store.mjs";

export const contract = "engineering.bound-documents/1-draft1";
export const bundleContract = "engineering.bound-document-bundle/1-draft1";
export const representation = "engineering-bound-documents-contract/1-draft1";
const ownImplementation = Promise.all(
  [
    "index.mjs",
    "store.mjs",
    "index.d.mts",
    "../source-adapters/index.mjs",
    "../component-contracts/index.mjs",
  ].map(async (name) => [
    name,
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Fixed module-relative implementation provenance inputs from the literal list above, never caller paths.
    sha256(await readFile(new URL(name, import.meta.url))),
  ]),
).then(identity);

export class ContextQueryError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "ContextQueryError";
    this.code = code;
    this.details = details;
  }
}
const refuse = (code, details) => {
  throw new ContextQueryError(code, details);
};
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nonempty = (v) => typeof v === "string" && v.length > 0;
const nullableText = (v) => v === null || typeof v === "string";
const uniqueIds = (v) =>
  Array.isArray(v) && v.every(nonempty) && new Set(v).size === v.length;
const digest = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
// Unknown source metadata stays in the retained original, not the model view.
// Keep the existing inventory fields and their original serialization order.
const inventoryFields = new Set([
  "sourceId",
  "uri",
  "revision",
  "capturedAt",
  "attribution",
  "provenance",
  "rawArtifactSha256",
  "unavailableReason",
  "bindingId",
  "bundleSha256",
  "recordSha256",
  "textSha256",
]);
const nullableInventoryText = new Set(["uri", "revision", "capturedAt"]);
function inventoryField(name, value) {
  if (!inventoryFields.has(name)) return false;
  if (nullableInventoryText.has(name)) return nullableText(value);
  if (name === "rawArtifactSha256") return value === null || digest(value);
  if (name === "attribution") return typeof value === "string";
  if (name === "provenance") return record(value);
  return true;
}
function keys(value, allowed) {
  if (!record(value) || Object.keys(value).some((k) => !allowed.includes(k)))
    refuse("invalid_shape");
}
function utc(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value.slice(0, 19)) ||
    !(value.slice(19) === "Z" || /^\.\d{1,3}Z$/.test(value.slice(19)))
  )
    refuse("invalid_deadline");
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().replace(/\.000Z$/, "Z") !==
      value
        .replace(/\.(\d{1,2})Z$/, (_, n) => `.${n.padEnd(3, "0")}Z`)
        .replace(/\.000Z$/, "Z")
  )
    refuse("invalid_deadline");
  return ms;
}
function requestValue(value) {
  const v = snapshotJson(value);
  if (!record(v)) refuse("invalid_shape");
  if (
    v.schema !== contract ||
    ![v.requestId, v.queryId, v.runId].every(nonempty) ||
    typeof v.question !== "string" ||
    !nullableText(v.scenarioId) ||
    !["documentation", "risk", "map"].includes(v.kind) ||
    !uniqueIds(v.sourceBindingIds)
  )
    refuse("invalid_request");
  if (!record(v.observations)) refuse("invalid_shape");
  for (const field of ["screen", "path"])
    if (v.observations[field] !== null) {
      const observation = v.observations[field];
      if (!record(observation)) refuse("invalid_shape");
      if (
        !nonempty(observation.producer) ||
        observation.basis !== "observed" ||
        !record(observation.content)
      )
        refuse("invalid_observation");
    }
  if (!record(v.retrieval)) refuse("invalid_shape");
  if (
    !(
      v.retrieval.sourceIds === null ||
      (Array.isArray(v.retrieval.sourceIds) &&
        v.retrieval.sourceIds.every(nonempty))
    ) ||
    !nullableText(v.retrieval.cursor)
  )
    refuse("invalid_retrieval");
  return v;
}
function validateBundle(value) {
  if (!record(value)) refuse("invalid_shape");
  if (value.schema !== bundleContract || !Array.isArray(value.documents))
    refuse("invalid_bundle");
  return value.documents.map((doc) => {
    const recordSha256 = identity(doc);
    const unavailable = (sourceId, unavailableReason) => ({
      source: { sourceId, unavailableReason },
      recordSha256,
    });
    if (!record(doc)) return unavailable(null, "invalid_shape");
    if (!nonempty(doc.sourceId))
      return unavailable(null, "invalid_source_identity");
    if (nonempty(doc.unavailableReason))
      return { source: { ...doc }, recordSha256 };
    if (typeof doc.text !== "string" || !doc.text.isWellFormed())
      return unavailable(doc.sourceId, "invalid_document");
    // Capture metadata is not a condition for reading usable source text.
    // Keep its original record identity; only typed inventory fields are shown.
    const source = { ...doc };
    delete source.unavailableReason;
    return { source, recordSha256 };
  });
}
function controls(value) {
  keys(value, ["deadlineAt", "outputBytes"]);
  if (!Number.isSafeInteger(value.outputBytes) || value.outputBytes < 1)
    refuse("invalid_output_budget");
  return {
    deadlineAt: value.deadlineAt,
    deadlineMs: utc(value.deadlineAt),
    outputBytes: value.outputBytes,
  };
}
const bytes = (v) => Buffer.byteLength(JSON.stringify(v), "utf8");

/** Host-only scope, grants, paths and storage. No environment or remote resolver. */
export async function createApplicationContextService(options) {
  const config = snapshotJson(options);
  keys(config, ["directory", "callerId", "runId", "bindings"]);
  if (
    !nonempty(config.directory) ||
    !nonempty(config.callerId) ||
    !nonempty(config.runId) ||
    !Array.isArray(config.bindings)
  )
    refuse("invalid_host_configuration");
  const bindingIds = new Set();
  for (const binding of config.bindings) {
    keys(binding, ["bindingId", "callerId", "runId", "path", "sha256"]);
    if (
      !nonempty(binding.bindingId) ||
      bindingIds.has(binding.bindingId) ||
      binding.callerId !== config.callerId ||
      binding.runId !== config.runId ||
      !nonempty(binding.path) ||
      !digest(binding.sha256)
    )
      refuse("invalid_host_binding");
    bindingIds.add(binding.bindingId);
  }
  const implementationSha256 = await ownImplementation;
  const scope = { callerId: config.callerId, runId: config.runId };
  const store = new QueryStore(config.directory);
  await store.initialize();
  const active = new Map();
  const queryKey = (queryId) => ({ scope, queryId });
  const invocationKey = (requestId) => ({ scope, requestId });
  const capabilities = snapshotJson({
    contract,
    representation,
    mode: "bound-documents/1",
    documentation: true,
    risk: false,
    map: false,
    semanticRelevance: "unassessed",
    providerCalls: 0,
    networkCalls: 0,
    browserCalls: 0,
    bindings: config.bindings.map((b) => b.bindingId),
  });

  async function execute(request, limit, signal, selectedBindings) {
    const started = performance.now();
    const accounting = {
      purpose: "bound-document-retrieval",
      sourceReadAttempts: 0,
      sourceReads: 0,
      sourceBytes: 0,
      providerAttempts: 0,
      providerCalls: 0,
      networkCalls: 0,
      browserCalls: 0,
      providerCost: {
        amount: 0,
        currency: "USD",
        basis: "no provider dispatch",
      },
      hostCost: null,
      elapsedMs: 0,
    };
    const base = {
      schema: contract,
      implementationSha256,
      requestId: request.requestId,
      queryId: request.queryId,
      runId: request.runId,
      mode: "bound-documents/1",
      semanticRelevance: "unassessed",
      status: "failed",
      reasons: [],
      inventory: [],
      documentation: [],
      mapAssertions: [],
      uncertainties: [],
      coverage: {
        sources: 0,
        unavailable: 0,
        sourceIndex: 0,
        textOffsetUtf16: 0,
      },
      nextCursor: null,
      accounting,
    };
    const check = () => {
      if (Date.now() >= limit.deadlineMs) refuse("deadline_exceeded");
      if (signal?.aborted) refuse("cancelled");
    };
    const finish = (result, updateElapsed = true) => {
      if (result.status !== "cancelled") check();
      if (updateElapsed)
        result.accounting.elapsedMs = Math.ceil(performance.now() - started);
      if (bytes(result) > limit.outputBytes)
        refuse("output_budget_too_small", { minimumBytes: bytes(result) });
      return result;
    };
    const selectedDescriptor = selectedBindings.map(
      (binding) => binding ?? null,
    );
    const { requestId: omittedRequest, retrieval, ...semantic } = request;
    void omittedRequest;
    const frozenInput = {
      ...semantic,
      sourceIds: retrieval.sourceIds,
      deadlineAt: limit.deadlineAt,
      bindings: selectedDescriptor,
      implementationSha256,
    };
    const queryIdentity = identity(frozenInput),
      key = queryKey(request.queryId);
    try {
      if (bytes(base) > limit.outputBytes)
        refuse("output_budget_too_small", { minimumBytes: bytes(base) });
      check();
      const claimed = await store.claim("query", key, {
        identity: queryIdentity,
        input: frozenInput,
      });
      const prior = await store.read("query", key);
      if (prior?.identity !== queryIdentity) refuse("query_identity_conflict");
      if (request.kind !== "documentation")
        return finish({
          ...base,
          status: "unavailable",
          reasons: [`${request.kind}_query_not_implemented`],
        });
      let snapshot;
      if (claimed) {
        if (retrieval.cursor !== null) refuse("cursor_without_query_snapshot");
        const sources = [];
        const verifiedBindingIds = [];
        for (let i = 0; i < request.sourceBindingIds.length; i++) {
          check();
          const binding = selectedBindings[i],
            bindingId = request.sourceBindingIds[i];
          if (!binding) {
            sources.push({
              bindingId,
              sourceId: null,
              unavailableReason: "binding_not_authorized",
            });
            continue;
          }
          try {
            accounting.sourceReadAttempts++;
            const raw = await readLocalBytes(binding, signal);
            accounting.sourceReads++;
            accounting.sourceBytes += raw.length;
            // Preserve verified original bytes even if Stop/deadline arrives
            // before parsing or result publication. These are private receipts.
            await store
              .save(
                "verified-source",
                { ...key, bindingId },
                {
                  bundleSha256: binding.sha256,
                  rawBase64: raw.toString("base64"),
                },
              )
              .catch(() => refuse("service_or_receipt_failure_do_not_replay"));
            check();
            const docs = validateBundle(
              JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)),
            );
            verifiedBindingIds.push(bindingId);
            for (const { source: doc, recordSha256 } of docs)
              sources.push({
                ...doc,
                bindingId,
                bundleSha256: binding.sha256,
                recordSha256,
                textSha256:
                  typeof doc.text === "string" && doc.text.isWellFormed()
                    ? sha256(doc.text)
                    : null,
              });
          } catch (error) {
            check();
            if (
              error instanceof ContextQueryError &&
              error.code === "service_or_receipt_failure_do_not_replay"
            )
              throw error;
            sources.push({
              bindingId,
              sourceId: null,
              unavailableReason:
                error instanceof ContextQueryError
                  ? error.code
                  : "source_unavailable_or_integrity_failure",
            });
          }
          await store.save("partial-sources", key, { queryIdentity, sources });
          await yieldTurn();
          check();
        }
        let selected = sources;
        if (retrieval.sourceIds !== null) {
          selected = sources.filter(
            (s) =>
              s.sourceId === null || retrieval.sourceIds.includes(s.sourceId),
          );
          for (const id of new Set(retrieval.sourceIds))
            if (!sources.some((s) => s.sourceId === id))
              selected.push({
                bindingId: null,
                sourceId: id,
                unavailableReason: "source_not_in_authorized_inventory",
              });
        }
        const occurrences = new Map();
        for (const source of selected)
          if (source.sourceId !== null)
            occurrences.set(
              source.sourceId,
              (occurrences.get(source.sourceId) ?? 0) + 1,
            );
        selected = selected.map((source) =>
          source.sourceId !== null && occurrences.get(source.sourceId) > 1
            ? {
                bindingId: source.bindingId,
                sourceId: null,
                bundleSha256: source.bundleSha256,
                recordSha256: source.recordSha256,
                textSha256: null,
                unavailableReason: "ambiguous_source_identity",
              }
            : source,
        );
        snapshot = {
          identity: queryIdentity,
          sources: selected,
          verifiedBindingIds,
        };
        await store.save("snapshot", key, snapshot);
        await store.claim("snapshot-hash", key, { sha256: identity(snapshot) });
      } else {
        snapshot = await store.read("snapshot", key);
        if (snapshot?.identity !== queryIdentity)
          refuse("prior_query_unresolved_do_not_replay");
        const snapshotHash = await store.read("snapshot-hash", key);
        if (snapshotHash?.sha256 !== identity(snapshot))
          refuse("retained_snapshot_integrity_failure");
        // Revalidate every initially admitted bundle, including those filtered by
        // sourceId. Initial acquisition failures stay frozen, with no retry.
        for (const binding of selectedBindings.filter(
          (binding) =>
            binding && snapshot.verifiedBindingIds.includes(binding.bindingId),
        )) {
          check();
          accounting.sourceReadAttempts++;
          try {
            const raw = await readLocalBytes(binding, signal);
            accounting.sourceReads++;
            accounting.sourceBytes += raw.length;
          } catch {
            check();
            refuse("source_snapshot_stale_or_unavailable");
          }
          await yieldTurn();
          check();
        }
      }
      check();
      let position = { sourceIndex: 0, textOffsetUtf16: 0 };
      if (retrieval.cursor !== null) {
        const saved = await store.read("cursor", {
          scope,
          token: retrieval.cursor,
        });
        if (
          saved?.queryIdentity !== queryIdentity ||
          saved?.queryId !== request.queryId ||
          identity(saved) !== retrieval.cursor
        )
          refuse("invalid_or_stale_cursor");
        position = saved.position;
      } else if (!claimed) refuse("continuation_cursor_required");
      const sources = snapshot.sources;
      const unavailable = sources.filter((s) => s.unavailableReason).length;
      base.coverage = { sources: sources.length, unavailable, ...position };
      if (sources.length === 0)
        return finish({
          ...base,
          status: request.sourceBindingIds.length ? "empty" : "unavailable",
          reasons: request.sourceBindingIds.length
            ? []
            : ["no_authorized_bindings"],
        });
      const source = sources[position.sourceIndex];
      if (!source) refuse("invalid_cursor_position");
      const { text } = source;
      const inventory = Object.fromEntries(
        Object.entries(source).filter(([name, value]) =>
          inventoryField(name, value),
        ),
      );
      base.inventory = [inventory];
      const token = randomBytes(32).toString("hex");
      const render = (end) => {
        const atEnd = source.unavailableReason || end === text.length;
        const next = atEnd
          ? { sourceIndex: position.sourceIndex + 1, textOffsetUtf16: 0 }
          : { sourceIndex: position.sourceIndex, textOffsetUtf16: end };
        const more = next.sourceIndex < sources.length;
        const status =
          unavailable === sources.length
            ? "unavailable"
            : more || unavailable
              ? "partial"
              : "complete";
        const result = {
          ...base,
          status,
          reasons: [
            ...(more ? ["page_remaining"] : []),
            ...(unavailable ? ["sources_unavailable"] : []),
          ],
          documentation: source.unavailableReason
            ? []
            : [
                {
                  sourceId: source.sourceId,
                  bindingId: source.bindingId,
                  text: text.slice(position.textOffsetUtf16, end),
                  citation: {
                    unit: "UTF-16",
                    start: position.textOffsetUtf16,
                    end,
                    textSha256: source.textSha256,
                    recordSha256: source.recordSha256,
                    bundleSha256: source.bundleSha256,
                    rawArtifactSha256:
                      source.rawArtifactSha256 === null ||
                      digest(source.rawArtifactSha256)
                        ? source.rawArtifactSha256
                        : null,
                    quoteSha256: sha256(
                      text.slice(position.textOffsetUtf16, end),
                    ),
                  },
                },
              ],
          nextCursor: more ? token : null,
        };
        result.accounting.elapsedMs = Math.ceil(performance.now() - started);
        return { result, next };
      };
      let end = 0;
      if (!source.unavailableReason) {
        // The final source page drops continuation metadata. Its whole result
        // can be smaller than a shorter partial page, so check it separately.
        if (bytes(render(text.length).result) <= limit.outputBytes)
          end = text.length;
        else {
          let low = position.textOffsetUtf16,
            high = text.length - 1;
          while (low < high) {
            check();
            const middle = Math.ceil((low + high) / 2);
            // Measure only whole Unicode scalars, including JSON escaping.
            let boundary = middle;
            if (
              boundary < text.length &&
              text.codePointAt(boundary - 1) > 0xffff
            )
              boundary--;
            if (bytes(render(boundary).result) <= limit.outputBytes)
              low = middle;
            else high = middle - 1;
          }
          if (low < text.length && text.codePointAt(low - 1) > 0xffff) low--;
          if (low === position.textOffsetUtf16 && low < text.length)
            refuse("output_budget_too_small");
          end = jsonTextChunkEnd(text, position.textOffsetUtf16, low);
          if (end === position.textOffsetUtf16 && end < text.length)
            refuse("output_budget_too_small");
        }
      }
      check();
      let { result, next } = render(end);
      // Accounting's digit width may grow during fitting; preserve the budget.
      while (
        bytes(result) > limit.outputBytes &&
        !source.unavailableReason &&
        end > position.textOffsetUtf16
      ) {
        if (
          end - position.textOffsetUtf16 <=
          (text.codePointAt(position.textOffsetUtf16) > 0xffff ? 2 : 1)
        )
          refuse("output_budget_too_small");
        end = jsonTextChunkEnd(text, position.textOffsetUtf16, end - 1);
        ({ result, next } = render(end));
      }
      // Keep the elapsed sample already included in page fitting. Resampling
      // here could grow its digit width after the final budget check.
      result = finish(result, false);
      if (result.nextCursor) {
        const cursor = {
          scope,
          queryIdentity,
          queryId: request.queryId,
          position: next,
          nonce: token,
        };
        result.nextCursor = identity(cursor);
        await store.save("cursor", { scope, token: result.nextCursor }, cursor);
      }
      // Cursor storage is still computation, not publication of this page.
      // Stop/deadline must win before the result is accepted for publication.
      check();
      return result;
    } catch (error) {
      if (
        error instanceof ContextQueryError &&
        ["cancelled", "deadline_exceeded"].includes(error.code)
      )
        return finish({ ...base, status: "cancelled", reasons: [error.code] });
      accounting.elapsedMs = Math.ceil(performance.now() - started);
      if (error instanceof ContextQueryError)
        error.details = { ...error.details, accounting };
      else
        throw new ContextQueryError(
          "service_or_receipt_failure_do_not_replay",
          { accounting },
        );
      throw error;
    }
  }

  async function query(value, control, { signal } = {}) {
    const request = requestValue(value),
      limit = controls(control);
    if (request.runId !== config.runId) refuse("run_not_authorized");
    const selected = request.sourceBindingIds.map(
      (id) => config.bindings.find((b) => b.bindingId === id) ?? null,
    );
    const fingerprint = identity({
      request,
      limit,
      bindings: selected,
      implementationSha256,
    });
    const key = invocationKey(request.requestId),
      activeKey = identity(key);
    const inflight = active.get(activeKey);
    if (inflight) {
      if (inflight.fingerprint !== fingerprint)
        refuse("request_identity_conflict");
      return inflight.promise;
    }
    const promise = (async () => {
      const claimed = await store.claim("intent", key, {
        fingerprint,
        request,
        limit,
        bindings: selected,
        implementationSha256,
      });
      const intent = await store.read("intent", key);
      if (intent?.fingerprint !== fingerprint)
        refuse("request_identity_conflict");
      if (!claimed) {
        const retained = await store.read("result", key);
        if (retained?.fingerprint === fingerprint) {
          if (retained.resultSha256 !== identity(retained.result))
            refuse("retained_result_integrity_failure");
          return snapshotJson(retained.result);
        }
        const failure = await store.read("failure", key);
        if (failure?.fingerprint === fingerprint)
          refuse(failure.code, failure.details);
        refuse("prior_invocation_unresolved_do_not_replay");
      }
      let computedResult;
      try {
        const controller = new AbortController();
        let timer;
        const armDeadline = () => {
          const remaining = limit.deadlineMs - Date.now();
          if (remaining <= 0) controller.abort();
          else {
            timer = setTimeout(armDeadline, Math.min(remaining, 2147483647));
            timer.unref();
          }
        };
        armDeadline();
        const combined = signal
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;
        let result;
        try {
          result = await execute(request, limit, combined, selected);
        } finally {
          clearTimeout(timer);
        }
        computedResult = result;
        await store.save("result", key, {
          fingerprint,
          result,
          resultSha256: identity(result),
        });
        return snapshotJson(result);
      } catch (error) {
        // Save only safe codes. A failed write leaves the permanent intent fence.
        const code =
          error instanceof ContextQueryError
            ? error.code
            : "service_or_receipt_failure_do_not_replay";
        const details = error instanceof ContextQueryError ? error.details : {};
        if (computedResult) details.accounting = computedResult.accounting;
        const failure = new ContextQueryError(code, details);
        if (computedResult)
          failure.originalResult = snapshotJson(computedResult);
        try {
          await store.save("failure", key, { fingerprint, code, details });
        } catch {
          failure.details = {
            ...details,
            receiptState: "unknown_do_not_replay",
          };
        }
        throw failure;
      }
    })().catch((error) => {
      if (error instanceof ContextQueryError) throw error;
      refuse("service_or_receipt_failure_do_not_replay");
    });
    active.set(activeKey, { fingerprint, promise });
    try {
      return await promise;
    } finally {
      active.delete(activeKey);
    }
  }
  return Object.freeze({ contract, capabilities, query });
}
