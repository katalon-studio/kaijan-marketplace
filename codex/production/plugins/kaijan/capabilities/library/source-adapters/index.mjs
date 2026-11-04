// ../source-adapters/index.mjs
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { componentSource } from "../component-contracts/index.mjs";
async function readLocalBytes({ path, sha256, maxBytes }, signal) {
  if (!isAbsolute(path) || !/^[a-f0-9]{64}$/.test(sha256) || maxBytes !== void 0 && (!Number.isSafeInteger(maxBytes) || maxBytes < 1))
    throw new Error(
      "Local source requires absolute path, SHA256 and a valid optional byte budget."
    );
  signal?.throwIfAborted();
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
  );
  try {
    const info = await file.stat();
    if (!info.isFile() || maxBytes !== void 0 && info.size > maxBytes)
      throw new Error(
        "Local source exceeds its byte budget or is not regular."
      );
    const bytes = Buffer.alloc(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      signal?.throwIfAborted();
      const { bytesRead } = await file.read(
        bytes,
        offset,
        bytes.length - offset,
        null
      );
      if (!bytesRead) throw new Error("Local source changed during read.");
      offset += bytesRead;
    }
    const extra = Buffer.alloc(1);
    if ((await file.read(extra, 0, 1, null)).bytesRead)
      throw new Error("Local source grew during read.");
    if (createHash("sha256").update(bytes).digest("hex") !== sha256)
      throw new Error("Local source digest mismatch.");
    return bytes;
  } finally {
    await file.close();
  }
}
export {
  readLocalBytes
};
