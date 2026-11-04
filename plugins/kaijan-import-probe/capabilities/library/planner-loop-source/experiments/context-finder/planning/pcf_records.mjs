import fs from "node:fs";
import { createHash } from "node:crypto";
import { encodedJson, parseJson, utf8 } from "../related/json.mjs";
// Validation context is private: keep Error messages and enumerable fields intact.
const validationDiagnostics = new WeakMap();
export function validationFailure(message, context) {
  const error = Error(message);
  if (context) validationDiagnostics.set(error, context());
  return error;
}
export const validationDiagnostic = (error) => validationDiagnostics.get(error);
export const pointer = (base, key) =>
  base + "/" + String(key).replaceAll("~", "~0").replaceAll("/", "~1");
export function referenceDiagnostic(
  path,
  values,
  inventory,
  duplicateFirst = true,
) {
  const duplicates = values.filter((id, index) => values.indexOf(id) !== index);
  const unknown = values.filter((id) => !inventory.includes(id));
  const duplicate = duplicateFirst
    ? duplicates.length > 0
    : unknown.length === 0;
  return {
    path,
    rule: duplicate ? "unique_ids" : "known_ids",
    offending_ids: [...new Set(duplicate ? duplicates : unknown)],
  };
}
export class PlanningFailure extends Error {
  constructor(reason, root, receipt) {
    super(reason);
    Object.assign(this, { reason, root, receipt });
  }
}
export const digest = (value) =>
  createHash("sha256")
    .update(utf8(encodedJson(value, { sortKeys: true, ascii: true })))
    .digest("hex");
export const openNew = (file) =>
  fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_NOFOLLOW |
      fs.constants.O_NONBLOCK,
    0o600,
  );
export function writeAll(fd, data) {
  let offset = 0;
  while (offset < data.length) {
    const count = fs.writeSync(fd, data, offset, data.length - offset);
    if (count <= 0) throw Error("No write progress");
    offset += count;
  }
  fs.fsyncSync(fd);
}
export function saveBytes(file, data) {
  const fd = openNew(file);
  try {
    writeAll(fd, data);
  } finally {
    fs.closeSync(fd);
  }
}
export const save = (file, value) =>
  saveBytes(file, utf8(encodedJson(value, { indent: 2 }) + "\n"));
export function readBytes(file, limit) {
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      (limit !== undefined && before.size > BigInt(limit))
    )
      throw Error("Expected bounded regular record");
    const parts = [];
    let length = 0;
    while (limit === undefined || length <= limit) {
      const chunk = Buffer.alloc(
        Math.min(65536, (limit ?? Infinity) + 1 - length),
      );
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!count) break;
      parts.push(chunk.subarray(0, count));
      length += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      (limit !== undefined && length > limit) ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs
    )
      throw Error("Record exceeded bound or changed");
    return Buffer.concat(parts);
  } finally {
    fs.closeSync(fd);
  }
}
export const readJson = (file) =>
  parseJson(
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      readBytes(file),
    ),
  );
