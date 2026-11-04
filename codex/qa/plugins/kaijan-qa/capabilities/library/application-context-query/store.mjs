import { constants } from "node:fs";
import { mkdir, open, lstat, realpath, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
};
export const identity = (value) => sha256(canonical(value));

// Private, exclusive claims survive process loss. No lock expiry or replay.
// Generic OperationHost's whole-result paging does not freeze a logical query
// across distinct invocations; these files retain that additional invariant.
export class QueryStore {
  constructor(directory) {
    this.directory = resolve(directory);
  }
  async initialize() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.directory);
    if (
      !info.isDirectory() ||
      info.uid !== process.getuid?.() ||
      info.mode & 0o077
    )
      throw Error("Unsafe context-query storage directory");
    this.directory = await realpath(this.directory);
  }
  path(kind, key) {
    return join(this.directory, `${kind}-${identity(key)}.json`);
  }
  async read(kind, key) {
    let file;
    try {
      file = await open(
        this.path(kind, key),
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    try {
      const info = await file.stat();
      if (
        !info.isFile() ||
        info.uid !== process.getuid?.() ||
        info.mode & 0o077 ||
        info.nlink !== 1
      )
        throw Error("Unsafe context-query receipt");
      try {
        return JSON.parse(await file.readFile("utf8"));
      } catch {
        throw Error("Context-query receipt is incomplete or invalid");
      }
    } finally {
      await file.close();
    }
  }
  async syncDirectory() {
    const parent = await open(
      this.directory,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
  }
  async claim(kind, key, value) {
    let file;
    try {
      file = await open(this.path(kind, key), "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") return false;
      throw error;
    }
    try {
      await file.writeFile(JSON.stringify(value));
      await file.sync();
    } finally {
      await file.close();
    }
    await this.syncDirectory();
    return true;
  }
  async save(kind, key, value) {
    const temporary = join(this.directory, `.pending-${randomUUID()}`);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(value));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, this.path(kind, key));
    await this.syncDirectory();
  }
}
