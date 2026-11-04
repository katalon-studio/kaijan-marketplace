import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";

export const VERSION = "2026.10.27-2";
export const CONTRACT = "pr-context-related/1";
export const repositoryPattern =
  /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
export const itemKey = (item) => `${item.repo.toLowerCase()}#${item.number}`;
// Identity only: never rewrite provenance, fetch a supplied URI or guess from text.
export function sourceItemKey(seed) {
  if (Number.isSafeInteger(seed.number) && seed.number > 0)
    return itemKey(seed);
  try {
    return itemKey(parseUrl(seed.source_uri ?? seed.url));
  } catch (error) {
    if (error instanceof RelatedError) return null;
    throw error;
  }
}
export function repositoryScope(repo, repositories = [repo]) {
  check(
    Array.isArray(repositories) &&
      repositories.length >= 1 &&
      repositories.every(
        (r) => typeof r === "string" && repositoryPattern.test(r),
      ),
    "invalid_repository_scope",
  );
  const normalized = repositories.map((r) => r.toLowerCase());
  check(
    new Set(normalized).size === normalized.length &&
      normalized.includes(repo.toLowerCase()),
    "invalid_repository_scope",
  );
  return normalized;
}
export const hash = (text) => createHash("sha256").update(text).digest("hex");
export class RelatedError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
export function check(condition, code) {
  if (!condition) throw new RelatedError(code);
}
export function readBytes(file, limit = 1024 * 1024) {
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOFOLLOW,
  );
  try {
    const st = fs.fstatSync(fd);
    check(st.isFile() && st.size <= limit, "invalid_input_file");
    const bytes = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < bytes.length) {
      const n = fs.readSync(fd, bytes, length, bytes.length - length, null);
      if (!n) break;
      length += n;
    }
    check(length <= limit, "input_too_large");
    return bytes.subarray(0, length);
  } finally {
    fs.closeSync(fd);
  }
}
export function readJson(file, limit = 1024 * 1024) {
  return JSON.parse(
    new globalThis.TextDecoder("utf-8", { fatal: true }).decode(
      readBytes(file, limit),
    ),
  );
}
export function recordStore(root) {
  fs.mkdirSync(root, { mode: 0o700 }); // New-only run; never replay an existing dispatch.
  return {
    write(name, value) {
      check(/^[a-z0-9.-]+$/.test(name), "invalid_record_name");
      const bytes = Buffer.isBuffer(value)
        ? value
        : Buffer.from(JSON.stringify(value, null, 2) + "\n");
      const fd = fs.openSync(path.join(root, name), "wx", 0o600);
      try {
        fs.writeFileSync(fd, bytes);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    },
    openResponse() {
      return fs.openSync(path.join(root, "response.bin"), "wx", 0o600);
    },
  };
}
export function parseUrl(value) {
  check(typeof value === "string", "missing_seed");
  const m =
    /^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*)\/(issues|pull)\/([1-9][0-9]*)\/?$/.exec(
      value,
    );
  check(m && Number.isSafeInteger(Number(m[3])), "invalid_seed_url");
  return {
    repo: m[1],
    kind: m[2] === "pull" ? "pr" : "issue",
    number: Number(m[3]),
    url: value.replace(/\/$/, ""),
  };
}
export function suppliedSeed(value) {
  check(
    value && typeof value === "object" && !Array.isArray(value),
    "invalid_supplied_seed",
  );
  check(
    Object.keys(value)
      .filter((k) => k !== "authorized_repositories")
      .sort()
      .join(",") === "captured_at,repo,revision,schema,source_uri,text,title",
    "invalid_supplied_fields",
  );
  check(
    value.schema === CONTRACT &&
      typeof value.repo === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(
        value.repo,
      ),
    "invalid_supplied_seed",
  );
  for (const key of ["title", "source_uri", "revision", "captured_at"]) {
    check(
      typeof value[key] === "string" && value[key].trim().length > 0,
      "invalid_supplied_seed",
    );
  }
  check(typeof value.text === "string", "invalid_supplied_seed");
  const uri = new URL(value.source_uri);
  check(
    ["https:", "urn:"].includes(uri.protocol) && !uri.username && !uri.password,
    "unsafe_source_uri",
  );
  check(Number.isFinite(Date.parse(value.captured_at)), "invalid_capture_time");
  if (Object.hasOwn(value, "authorized_repositories"))
    repositoryScope(value.repo, value.authorized_repositories);
  return {
    ...value,
    kind: "supplied",
    url: value.source_uri,
    body: value.text,
  };
}
