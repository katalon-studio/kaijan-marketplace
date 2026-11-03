// Exact source capture and citation binding shared by selected and experimental consumers.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { sanitizeMetadataUrls } from "./metadata-urls.mjs";
export const SOURCE_BOUND_REVIEW = "work-verifier/source-bound-review/1";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => globalThis.structuredClone(value);
const identifier = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const kinds = [
  "implementation",
  "test_source",
  "execution_record",
  "authored_context",
  "change_inventory",
];
export function losslessText(text) {
  assert.equal(typeof text, "string");
  assert.equal(
    Buffer.from(text).toString("utf8"),
    text,
    "Lossless UTF-8 text required",
  );
}

export function boundary(text, offset) {
  return (
    Number.isSafeInteger(offset) &&
    offset >= 0 &&
    offset <= text.length &&
    !(
      offset > 0 &&
      offset < text.length &&
      /[\uD800-\uDBFF]/.test(text[offset - 1]) &&
      /[\uDC00-\uDFFF]/.test(text[offset])
    )
  );
}

export function validRange(text, start, end) {
  return boundary(text, start) && boundary(text, end) && end > start;
}

export function immutable(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

export function linesFor(text, format) {
  const lines = [];
  let oldLeft = 0,
    newLeft = 0;
  for (const match of text.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!match[0]) continue;
    const line = match[0];
    let side = "full";
    if (format === "unified_diff") {
      side = "metadata";
      if (line.startsWith("@@ -")) {
        const parts = line.trimEnd().split(" ");
        assert.ok(
          parts[0] === "@@" && parts[3] === "@@" && parts[2]?.startsWith("+"),
          "Malformed diff header",
        );
        const count = (range) => {
          const values = range.slice(1).split(",");
          assert.ok(
            values.length <= 2 &&
              values.every(
                (value) =>
                  /^\d+$/.test(value) && Number.isSafeInteger(Number(value)),
              ),
            "Invalid diff range",
          );
          return Number(values[1] ?? 1);
        };
        assert.equal(oldLeft + newLeft, 0, "Incomplete diff hunk");
        oldLeft = count(parts[1]);
        newLeft = count(parts[2]);
        side = "hunk_header";
      } else if (oldLeft || newLeft) {
        if (line.startsWith("+")) {
          newLeft--;
          side = "added";
        } else if (line.startsWith("-")) {
          oldLeft--;
          side = "base";
        } else if (line.startsWith(" ")) {
          oldLeft--;
          newLeft--;
          side = "context";
        } else assert.ok(line.startsWith("\\"), "Malformed diff body");
        assert.ok(oldLeft >= 0 && newLeft >= 0, "Diff counts disagree");
      } else
        assert.ok(!/^[+-](?!\+\+|--)/.test(line), "Diff body outside a hunk");
    }
    lines.push({
      id: `line_${lines.length + 1}`,
      startUtf16: match.index,
      endUtf16: match.index + line.length,
      side,
    });
  }
  assert.equal(oldLeft + newLeft, 0, "Incomplete final diff hunk");
  if (format === "unified_diff")
    assert.ok(
      lines.some((line) => line.side === "hunk_header"),
      "Diff requires a hunk",
    );
  return lines;
}

export function validateSourceCaptureInput(input) {
  assert.deepEqual(
    JSON.parse(JSON.stringify(input)),
    input,
    "Lossless JSON input required",
  );
  assert.equal(
    input.contractVersion,
    SOURCE_BOUND_REVIEW,
    "Explicit contract version required",
  );
  assert(
    ["gpt-6-luna", "gpt-6.1-terra"].includes(input.model),
    "Supported analysis model required",
  );
  losslessText(input.workItem?.title);
  losslessText(input.workItem?.body);
  assert.equal(
    sanitizeMetadataUrls(input.workItem.provenance ?? {}).redactions.length,
    0,
    "Unsafe work-item metadata URL",
  );
}

export function captureSourceRecords(
  input,
  {
    expected = { status: "ready", targets: [], origin: "source_capture_only" },
    maxSources,
    requireNonempty = false,
  } = {},
) {
  validateSourceCaptureInput(input);
  const capture = clone(input),
    inputHash = hash(JSON.stringify(input));
  assert.ok(
    Array.isArray(input.sources) &&
      (maxSources === undefined || input.sources.length <= maxSources),
  );
  assert.ok(
    Array.isArray(input.selectedSourceIds) &&
      new Set(input.selectedSourceIds).size === input.selectedSourceIds.length,
  );
  const inventory = [],
    supplied = [],
    ids = new Set();
  for (const source of input.sources) {
    assert.match(source.id, identifier);
    assert.ok(!ids.has(source.id), "Duplicate source identity");
    ids.add(source.id);
    assert.ok(kinds.includes(source.kind));
    assert.ok(["full_text", "unified_diff"].includes(source.format));
    losslessText(source.text);
    assert.ok(source.text.length > 0 || !requireNonempty);
    assert.ok(
      typeof source.provenance?.path === "string" &&
        source.provenance.path.length,
    );
    assert.ok(
      typeof source.provenance?.revision === "string" &&
        source.provenance.revision.length,
    );
    assert.equal(
      sanitizeMetadataUrls(source.provenance).redactions.length,
      0,
      "Unsafe metadata URL",
    );
    const sha256 = hash(source.text);
    if (source.sha256 !== undefined)
      assert.equal(source.sha256, sha256, "Source hash differs");
    const record = {
      id: source.id,
      kind: source.kind,
      format: source.format,
      sha256,
      bytes: Buffer.byteLength(source.text),
      provenance: clone(source.provenance),
    };
    inventory.push(record);
    if (input.selectedSourceIds.includes(source.id))
      supplied.push({
        ...record,
        text: source.text,
        lines: linesFor(source.text, source.format),
      });
  }
  assert.ok(
    input.selectedSourceIds.every((id) => ids.has(id)),
    "Unknown source selection",
  );
  assert.equal(
    sanitizeMetadataUrls(input.capture ?? {}).redactions.length,
    0,
    "Unsafe capture metadata URL",
  );
  const state = {
    contractVersion: SOURCE_BOUND_REVIEW,
    workItem: clone(input.workItem),
    targets: expected.targets,
    sourceInventory: inventory,
    suppliedSources: supplied,
    omittedSourceIds: inventory
      .filter((s) => !input.selectedSourceIds.includes(s.id))
      .map((s) => s.id),
    capture: clone(input.capture ?? {}),
    semanticPartitionCompleteness: "unverified",
    limitation:
      "All source kinds/provenance are caller declarations. Full captures retained separately. Static text and authored tests are not executed results. Source binding is independent from semantic support; no whole-target acceptance is available.",
  };
  return immutable({ status: "captured", capture, inputHash, expected, state });
}

export function captureWorkItemSources(input) {
  return captureSourceRecords(input);
}

export function exactKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === [...keys].sort().join()
  );
}

export function bindPointer(state, pointer) {
  const fail = (reason) => ({
    status: "invalid",
    reason,
    rendered: null,
    semanticSupport: null,
  });
  if (
    !exactKeys(pointer, ["sourceId", "sourceSha256", "startUtf16", "endUtf16"])
  )
    return fail("malformed_pointer");
  const entry = state.sourceInventory.find((s) => s.id === pointer.sourceId);
  if (!entry) return fail("unknown_source");
  const source = state.suppliedSources.find((s) => s.id === pointer.sourceId);
  if (!source) return fail("source_not_supplied");
  if (pointer.sourceSha256 !== source.sha256) return fail("stale_source_hash");
  if (!validRange(source.text, pointer.startUtf16, pointer.endUtf16))
    return fail("invalid_or_split_utf16_range");
  const text = source.text.slice(pointer.startUtf16, pointer.endUtf16);
  return {
    status: "bound",
    pointer: clone(pointer),
    sourceKind: source.kind,
    provenance: clone(source.provenance),
    rendered: {
      text,
      bytes: Buffer.byteLength(text),
      sha256: hash(text),
      lines: source.lines
        .filter(
          (l) =>
            l.endUtf16 > pointer.startUtf16 && l.startUtf16 < pointer.endUtf16,
        )
        .map(clone),
    },
    semanticSupport: null,
  };
}

export function bindCapturedSourcePointer(captured, pointer) {
  assert.equal(captured?.status, "captured");
  const verified = captureWorkItemSources(captured.capture);
  assert.deepEqual(verified, captured, "Captured source changed; no rebinding");
  return bindPointer(verified.state, pointer);
}

function schemaErrors(value, schema, path = "$", errors = []) {
  if (schema.anyOf) {
    if (!schema.anyOf.some((s) => schemaErrors(value, s).length === 0))
      errors.push({ path, reason: "invalid_typed_variant" });
    return errors;
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push({ path, reason: "object_required" });
      return errors;
    }
    for (const key of schema.required)
      if (!Object.hasOwn(value, key))
        errors.push({ path: `${path}.${key}`, reason: "required" });
    for (const key of Object.keys(value))
      if (!Object.hasOwn(schema.properties, key))
        errors.push({ path: `${path}.${key}`, reason: "unexpected_field" });
    for (const [key, child] of Object.entries(schema.properties))
      if (Object.hasOwn(value, key))
        schemaErrors(value[key], child, `${path}.${key}`, errors);
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) errors.push({ path, reason: "array_required" });
    else if (value.length > schema.maxItems)
      errors.push({ path, reason: "array_bound_no_prefix" });
    else
      value.forEach((item, index) =>
        schemaErrors(item, schema.items, `${path}[${index}]`, errors),
      );
  } else if (schema.type === "null") {
    if (value !== null) errors.push({ path, reason: "null_required" });
  } else if (schema.type === "integer") {
    if (
      !Number.isSafeInteger(value) ||
      value < schema.minimum ||
      (schema.maximum !== undefined && value > schema.maximum)
    )
      errors.push({ path, reason: "invalid_integer" });
  } else if (
    typeof value !== "string" ||
    (schema.minLength && !value.length) ||
    (schema.maxLength && Array.from(value).length > schema.maxLength) ||
    (schema.enum && !schema.enum.includes(value))
  )
    errors.push({ path, reason: "invalid_string_or_enum" });
  return errors;
}

export { schemaErrors as reviewSchemaErrors };
export { linesFor as literalSourceLines };
