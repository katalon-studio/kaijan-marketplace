// Local operator command. The file's values never become MCP arguments.
import { constants } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { parseArgs, parseEnv, TextDecoder } from "node:util";
import { pathToFileURL } from "node:url";
import { bindProfileState } from "./profile-state.mjs";
import { resolveRuntimeBuild } from "./runtime-profile.mjs";

async function readEntries(path, mappings) {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    if (!(await file.stat()).isFile())
      throw Error("Expected an environment file");
    const contents = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.readFile(),
    );
    const environment = parseEnv(contents);
    return new Map(
      mappings.map((mapping) => {
        const matched = /^([^=]+)=([A-Za-z_][A-Za-z0-9_]*)$/.exec(mapping);
        if (!matched || !Object.hasOwn(environment, matched[2]))
          throw Error("Missing mapped value");
        const [, key, variable] = matched;
        if (!environment[variable]) throw Error("Missing mapped value");
        return [key, { key, secret: true, value: environment[variable] }];
      }),
    );
  } finally {
    await file.close();
  }
}

async function saveConfiguration(root, argv) {
  const [command, ...args] = argv;
  if (command !== "save") throw Error("Expected save");
  const { values } = parseArgs({
    args,
    options: {
      "from-file": { type: "string" },
      name: { type: "string" },
      application: { type: "string" },
      host: { type: "string", multiple: true },
      secret: { type: "string", multiple: true },
      id: { type: "string" },
      revision: { type: "string" },
    },
  });
  const { "from-file": file, name, application, host, secret, id } = values;
  const revision =
    values.revision === undefined ? undefined : Number(values.revision);
  if (!file || !secret?.length) throw Error("Select the file and fields");
  if (
    id === undefined
      ? !name || !application || revision !== undefined
      : !id ||
        !Number.isSafeInteger(revision) ||
        revision < 1 ||
        name !== undefined ||
        application !== undefined ||
        host !== undefined
  )
    throw Error(
      "Select a new application or an existing Configuration revision",
    );
  const entries = await readEntries(file, secret);
  if (entries.size !== secret.length) throw Error("Use each field once");

  const build = resolveRuntimeBuild(
    JSON.parse(await readFile(join(root, "loki-build.json"), "utf8")),
  );
  if (
    process.env.LOKI_CORE_ORIGIN &&
    process.env.LOKI_CORE_ORIGIN !== build.coreOrigin
  )
    throw Error("Profile mismatch");
  const directory =
    build.host === "claude_code"
      ? process.env.LOKI_CLAUDE_STATE_DIR
      : process.env.LOKI_CODEX_STATE_DIR;
  if (directory !== undefined && !isAbsolute(directory))
    throw Error("Expected an absolute state directory");
  const { state } = await bindProfileState(
    build,
    directory === undefined ? [] : ["--state", directory],
    homedir(),
  );
  // eslint-disable-next-line no-restricted-syntax -- Fixed library in the installed package.
  const { ConfigurationStore } = await import(
    pathToFileURL(join(root, "capabilities/library/api.mjs")).href
  );
  const store = await ConfigurationStore.open(state);
  try {
    const previous = id
      ? store.read(id)
      : { name, application, allowedHosts: host ?? [], entries: [] };
    for (const { key, secret: hidden, value } of previous.entries) {
      if (!entries.has(key))
        entries.set(key, { key, secret: hidden, ...(hidden ? {} : { value }) });
    }
    const saved = store.save(
      {
        name: previous.name,
        application: previous.application,
        allowedHosts: previous.allowedHosts,
        entries: [...entries.values()],
      },
      id,
      revision,
    );
    return { id: saved.id, revision: saved.revision, name: saved.name };
  } finally {
    store.close();
  }
}

try {
  const saved = await saveConfiguration(
    resolve(import.meta.dirname, ".."),
    process.argv.slice(2),
  );
  process.stdout.write(JSON.stringify(saved) + "\n");
} catch {
  // File, parser, and store errors can contain input values.
  process.stderr.write(
    "Configuration was not confirmed. Check the local file, field names, and current Configuration revision. Use save --from-file PATH --secret FIELD=VARIABLE with --name NAME --application URL, or with --id ID --revision REVISION. Read the Configuration before retrying.\n",
  );
  process.exitCode = 1;
}
