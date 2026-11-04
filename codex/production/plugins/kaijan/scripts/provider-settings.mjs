// Host setup only. Provider secrets are never MCP tool arguments.
import process from "node:process";
import { constants } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseEnv, TextDecoder } from "node:util";
import { pathToFileURL } from "node:url";
import { bindProfileState } from "./profile-state.mjs";

async function readEnvironment(file) {
  const handle = await open(
    file,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 128 * 1024)
      throw Error("Invalid environment file");
    // Parse data, never source a shell script or apply NODE_OPTIONS to this process.
    return parseEnv(
      new TextDecoder("utf-8", { fatal: true }).decode(await handle.readFile()),
    );
  } finally {
    await handle.close();
  }
}

export async function providerSettingsCommand(
  root,
  args,
  home = homedir(),
  environment = process.env,
) {
  const build = JSON.parse(
    await readFile(join(root, "loki-build.json"), "utf8"),
  );
  if (
    environment.LOKI_CORE_ORIGIN &&
    environment.LOKI_CORE_ORIGIN !== build.coreOrigin
  )
    throw Error("Profile mismatch");
  const [command, ...options] = args;
  if (!["show", "configure"].includes(command)) throw Error("Unknown command");
  let envFile, state;
  for (let i = 0; i < options.length; i += 2) {
    const option = options[i],
      value = options[i + 1];
    if (!value || value.startsWith("--")) throw Error("Missing option value");
    if (
      option === "--from-file" &&
      command === "configure" &&
      envFile === undefined
    )
      envFile = value;
    else if (option === "--state" && state === undefined) state = value;
    else throw Error("Unknown or repeated option");
  }
  state ??= environment.LOKI_CODEX_STATE_DIR;
  if (state !== undefined && !isAbsolute(state))
    throw Error("Absolute state required");
  if (build.authArchitecture === "shared-broker-v1") {
    if (command === "configure") throw Error("Use managed sign-in");
    return {
      route: "managed-broker",
      nextAction:
        "Use Kaijan sign-in, then check the selected tool's readiness. No local provider key is required by this package.",
    };
  }
  const selected = await bindProfileState(
    build,
    state === undefined ? [] : ["--state", state],
    home,
  );
  // eslint-disable-next-line no-restricted-syntax -- Fixed library in the selected installed package.
  const library = await import(
    pathToFileURL(join(root, "capabilities/library/api.mjs")).href
  );
  if (command === "configure") {
    const input =
      envFile === undefined ? environment : await readEnvironment(envFile);
    await library.adoptProviderEnvironment(selected.state, input);
  }
  const { diagnostic, environment: provider } =
    await library.resolveProviderEnvironment(selected.state);
  return {
    route: "direct-openai",
    configuration: diagnostic,
    jev: {
      configured: Boolean(provider.LOKI_OPENROUTER_API_KEY),
      requiredFor:
        "JEV only; not browser execution or ordinary OpenAI planning",
    },
    saved: command === "configure",
    connectionTested: false,
    nextAction:
      diagnostic.state === "configured"
        ? "Provider settings are present. Continue the requested task. Saved settings apply to new operations without a rebuild or reconnect. The host environment overrides saved keys."
        : "Run provider-settings.mjs configure --from-file with an approved local file containing OPENAI_API_KEY. Keep keys out of chat. Setup and retained reports can still be used without a key.",
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const result = await providerSettingsCommand(
      resolve(import.meta.dirname, ".."),
      process.argv.slice(2),
    );
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch {
    // Never echo parser errors, argument values, file contents or credentials.
    process.stderr.write(
      "Provider settings were not saved. Use show, or configure [--from-file PATH], with optional --state ABSOLUTE_PATH. For native access, supply an approved OPENAI_API_KEY. Check the file and private profile. Managed packages use Kaijan sign-in instead.\n",
    );
    process.exitCode = 1;
  }
}
