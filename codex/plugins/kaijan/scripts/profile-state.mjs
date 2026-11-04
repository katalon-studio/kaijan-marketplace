import { TextDecoder } from "node:util";
import { constants } from "node:fs";
import {
  mkdir,
  open,
  readdir,
  realpath,
  stat,
  link,
  unlink,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";

// A profile is an environment boundary; a version update is not a new identity.
export async function bindProfileState(build, args, home) {
  if (
    !["local", "qa", "production"].includes(build.profile) ||
    typeof build.coreOrigin !== "string" ||
    typeof build.oauthClientId !== "string"
  )
    throw new Error(
      "Missing fixed plugin profile. Reinstall the selected artifact.",
    );
  const identity = JSON.stringify({
    profile: build.profile,
    origin: build.coreOrigin,
    client: build.oauthClientId,
  });
  const key = createHash("sha256").update(identity).digest("hex").slice(0, 20);
  let selected;
  const forwarded = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--state" || arg.startsWith("--state=")) {
      if (selected !== undefined)
        throw new Error("Supply one private state directory.");
      selected = arg === "--state" ? args[++i] : arg.slice(8);
      if (!selected || selected.startsWith("--"))
        throw new Error("Missing private state directory.");
    } else if (arg === "--host" || arg.startsWith("--host=")) {
      const host = arg === "--host" ? args[++i] : arg.slice(7);
      if (host !== "codex")
        throw new Error("This package belongs to the Codex host.");
    } else forwarded.push(arg);
  }
  const state = resolve(
    selected ??
      join(home, ".local", "share", "loki", "codex", build.profile, key),
  );
  await mkdir(state, { recursive: true, mode: 0o700 });
  if (
    (await realpath(state)) !== state ||
    ((await stat(state)).mode & 0o077) !== 0
  )
    throw new Error("Use a canonical private state directory with mode 0700.");
  const path = join(state, "plugin-profile.json");
  const expected = {
    schemaVersion: 1,
    profile: build.profile,
    coreOrigin: build.coreOrigin,
    oauthClientId: build.oauthClientId,
  };
  let file;
  const readBinding = () =>
    open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  try {
    file = await readBinding();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if ((await readdir(state)).length) {
      // A concurrent first caller may already have published the binding.
      try {
        file = await readBinding();
      } catch (readError) {
        if (readError.code !== "ENOENT") throw readError;
        throw new Error(
          "Unbound populated state cannot be reused. Select a fresh profile state; do not copy credentials.",
          { cause: readError },
        );
      }
    } else {
      // Fully write a private sibling file before publishing it without overwrite.
      // Keeping it outside state lets concurrent callers see an empty directory
      // or a complete binding, never an unfinished JSON document.
      const temporary = join(dirname(state), `.loki-profile-${randomUUID()}`);
      const created = await open(temporary, "wx", 0o600);
      try {
        try {
          await created.writeFile(JSON.stringify(expected));
          await created.sync();
        } finally {
          await created.close();
        }
        try {
          await link(temporary, path);
        } catch (linkError) {
          if (linkError.code !== "EEXIST") throw linkError;
        }
      } finally {
        await unlink(temporary);
      }
      file = await readBinding();
    }
  }
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 4096 || (info.mode & 0o077) !== 0)
      throw new Error("Invalid private profile binding.");
    const actual = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(await file.readFile()),
    );
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(
        "Private state belongs to a different environment. Select its own state directory.",
      );
  } finally {
    await file.close();
  }
  return { state, args: [...forwarded, "--host", "codex", "--state", state] };
}
