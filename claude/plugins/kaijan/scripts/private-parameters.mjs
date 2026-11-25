// apps/claude-plugin/src/mcpb-private-parameters.mjs
import { mkdtemp as mkdtemp2, rm as rm2 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join3, resolve as resolve2 } from "node:path";
import { spawn } from "node:child_process";

// apps/claude-plugin/scripts/mcpb-distribution.mjs
import assert from "node:assert/strict";
import { createHash as createHash2 } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile as readFile2, rm, writeFile } from "node:fs/promises";
import { join as join2, resolve } from "node:path";
import { verifyDistribution } from "../capabilities/dist/runtime/payload.js";

// apps/claude-plugin/scripts/distribution-inventory.mjs
import { readdir, readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
async function archiveInventory(root) {
  const files = {};
  for (const name of (await readdir(root, { recursive: true })).sort()) {
    const info = await lstat(join(root, name));
    if (info.isDirectory()) continue;
    if (!info.isFile()) throw Error("Archive inputs must be regular files.");
    files[name] = {
      sha256: createHash("sha256").update(await readFile(join(root, name))).digest("hex"),
      bytes: info.size,
      executable: Boolean(info.mode & 73)
    };
  }
  return files;
}

// apps/claude-plugin/scripts/mcpb-distribution.mjs
var digest = (bytes) => createHash2("sha256").update(bytes).digest("hex");
var bundlePath = "servers/kaijan-local.mcpb";
async function verifyLocalMcpBundle(plugin, build, destination) {
  const outer = JSON.parse(
    await readFile2(join2(plugin, "loki-build.json"), "utf8")
  );
  build ??= outer;
  assert.deepEqual(Object.keys(build.capabilityTransport).sort(), [
    "bundle",
    "format",
    "privateHelperSha256",
    "sha256"
  ]);
  assert.equal(build.capabilityTransport.format, "mcpb/1");
  assert.equal(build.capabilityTransport.bundle, bundlePath);
  const bundle = join2(plugin, bundlePath);
  assert.equal(
    digest(await readFile2(bundle)),
    build.capabilityTransport.sha256
  );
  const names = execFileSync("unzip", ["-Z1", bundle], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 ** 2
  }).trim().split("\n");
  assert.equal(new Set(names).size, names.length);
  assert.ok(
    names.every(
      (name) => !name.startsWith("/") && !name.split("/").some((part) => part === ".." || part === ".") && !name.includes("\\") && [...name].every(
        (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127
      ) && /^(?:capabilities\/|scripts\/|loki-build\.json$|manifest\.json$)/.test(
        name
      )
    )
  );
  const modes = execFileSync("unzip", ["-Z", "-l", bundle], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 ** 2
  });
  assert.ok(
    !modes.split("\n").some((line) => /^[lbcpDs]/.test(line)),
    "MCPB members must be regular files/directories"
  );
  await mkdir(destination, { mode: 448 });
  execFileSync("unzip", ["-q", bundle, "-d", resolve(destination)]);
  const original = JSON.parse(
    await readFile2(join2(destination, "loki-build.json"), "utf8")
  );
  const { capabilityTransport, ...outerBuild } = outer;
  assert.deepEqual(original, outerBuild);
  for (const field of [
    "buildId",
    "sourceRevision",
    "capabilityDigest",
    "pluginVersion"
  ])
    assert.equal(build[field], original[field]);
  assert.deepEqual(build.capabilityTransport, capabilityTransport);
  const identity = await verifyDistribution(
    join2(destination, "capabilities"),
    build.capabilityDigest
  );
  const inner = await archiveInventory(join2(destination, "capabilities"));
  const outerFiles = await archiveInventory(join2(plugin, "capabilities"));
  const expected = Object.fromEntries(
    Object.entries(inner).filter(
      ([name]) => !name.startsWith("library/") && !["payload-manifest.json", "payload-manifest.sha256"].includes(name)
    )
  );
  assert.deepEqual(outerFiles, expected);
  const outerScripts = await archiveInventory(join2(plugin, "scripts"));
  const innerScripts = await archiveInventory(join2(destination, "scripts"));
  assert.equal(
    outerScripts["private-parameters.mjs"].sha256,
    capabilityTransport.privateHelperSha256
  );
  delete outerScripts["private-parameters.mjs"];
  delete innerScripts["private-parameters.mjs"];
  assert.deepEqual(outerScripts, innerScripts);
  const manifest = JSON.parse(
    await readFile2(join2(destination, "manifest.json"), "utf8")
  );
  assert.equal(manifest.manifest_version, "0.3");
  assert.equal(manifest.name, "kaijan_local");
  assert.equal(manifest.version, build.pluginVersion);
  assert.equal(manifest.server.type, "binary");
  assert.equal(manifest.server.entry_point, "capabilities/runtime/node");
  assert.equal(
    manifest.server.mcp_config.command,
    "${__dirname}/capabilities/runtime/node"
  );
  assert.deepEqual(manifest.server.mcp_config.args, [
    "${__dirname}/scripts/local-mcp.mjs"
  ]);
  const local = manifest.server.mcp_config;
  assert.deepEqual(local.env, {
    OPENAI_API_KEY: "",
    LOKI_OPENROUTER_API_KEY: "",
    LOKI_OPENROUTER_BASE_URL: "",
    LOKI_MODEL_PROVIDER: "",
    NODE_OPTIONS: "",
    NODE_PATH: ""
  });
  return {
    identity,
    config: {
      command: local.command.replaceAll("${__dirname}", resolve(destination)),
      args: local.args.map(
        (value) => value.replaceAll("${__dirname}", resolve(destination))
      ),
      env: local.env
    }
  };
}

// apps/claude-plugin/src/mcpb-private-parameters.mjs
async function main() {
  let temporary, child, interrupted;
  let outcome;
  const inlineForms = process.argv[2] === "--inline-forms";
  const configuration = process.argv[2] === "--configuration";
  const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
  const handlers = signals.map((signal2) => {
    const handler = () => {
      if (interrupted) return;
      interrupted = signal2;
      child?.kill(signal2);
    };
    process.on(signal2, handler);
    return handler;
  });
  try {
    temporary = await mkdtemp2(
      inlineForms ? "/tmp/kcj-inline-" : join3(tmpdir(), "kcj-private-parameters-")
    );
    const payload = join3(temporary, "payload");
    const root = resolve2(import.meta.dirname, "..");
    await verifyLocalMcpBundle(root, void 0, payload);
    if (!interrupted) {
      child = spawn(
        process.execPath,
        [
          join3(
            payload,
            inlineForms ? "scripts/inline-forms.mjs" : configuration ? "scripts/configuration.mjs" : "scripts/private-parameters.mjs"
          ),
          ...inlineForms ? [process.argv[3] ?? "", join3(temporary, "form.sock")] : process.argv.slice(configuration ? 3 : 2)
        ],
        { stdio: "inherit", env: process.env }
      );
      outcome = await new Promise((resolve3, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal2) => resolve3({ code, signal: signal2 }));
      });
    }
  } finally {
    if (temporary) await rm2(temporary, { recursive: true, force: true });
    for (const [index, signal2] of signals.entries())
      process.off(signal2, handlers[index]);
  }
  const signal = interrupted ?? outcome?.signal;
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = outcome?.code ?? 1;
}
main().catch(() => {
  process.stderr.write(
    "Private login setup failed. Check the approved environment and installed package. No credential values were printed.\n"
  );
  process.exitCode = 1;
});
