// apps/claude-plugin/src/onboarding-state.mjs
import { writeFile as writeFile2, readFile as readFile2 } from "node:fs/promises";
import { join as join2, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// apps/codex-plugin/profiles.json
var profiles_default = {
  local: {
    displayName: "Kaijan \u2014 Local",
    pluginName: "kaijan-local",
    marketplaceName: "kaijan-local",
    oauthClientId: "loki-codex",
    mcpServerName: "kaijan_core_local",
    localMcpServerName: "kaijan_local_local"
  },
  qa: {
    displayName: "Kaijan \u2014 QA",
    pluginName: "kaijan-qa",
    marketplaceName: "kaijan-qa",
    oauthClientId: "loki-codex",
    coreOrigin: "https://loki-app.qa.katalon.com",
    mcpServerName: "kaijan_core_qa",
    localMcpServerName: "kaijan_local_qa"
  },
  production: {
    displayName: "Kaijan",
    pluginName: "kaijan",
    marketplaceName: "kaijan",
    coreOrigin: "https://kaijan.ai",
    oauthClientId: "loki-codex",
    mcpServerName: "kaijan_core",
    localMcpServerName: "kaijan_local"
  }
};

// apps/claude-plugin/scripts/runtime-profile.mjs
function resolveRuntimeBuild(build, env = process.env) {
  if (build.profileMode !== "runtime-env/1") return build;
  if (build.host !== "claude_code" || build.profile !== "production" || build.authArchitecture !== "shared-broker-v1" || build.runtimeClientId !== "kaijan-claude-runtime")
    throw Error("Invalid Claude runtime-profile package.");
  const profile = env.KAIJAN_PROFILE === void 0 || env.KAIJAN_PROFILE === "prod" ? "production" : env.KAIJAN_PROFILE;
  const invalid = () => Object.assign(
    new Error(
      "Set KAIJAN_PROFILE to qa or production, or unset it for Production. Unset conflicting LOKI_CORE_ORIGIN."
    ),
    { code: "runtime_profile_invalid" }
  );
  if (!["production", "qa"].includes(profile)) throw invalid();
  const selected = profiles_default[profile];
  if (env.LOKI_CORE_ORIGIN && env.LOKI_CORE_ORIGIN !== selected.coreOrigin)
    throw invalid();
  return {
    ...build,
    profile,
    coreOrigin: selected.coreOrigin,
    mcpUrl: `${selected.coreOrigin}/mcp`,
    oauthClientId: build.runtimeClientId
  };
}

// apps/codex-plugin/src/auth/profile.mjs
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  lstat,
  realpath,
  readFile,
  writeFile,
  rename,
  link,
  unlink
} from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

// apps/codex-plugin/src/host.mjs
function pluginHost(build) {
  const host = build.host ?? "codex";
  if (!["codex", "claude_code"].includes(host))
    throw Error("Unsupported plugin host");
  return host;
}
function installationPrefix(build) {
  return pluginHost(build) === "claude_code" ? "kaijan-claude-plugin-" : "kaijan-codex-plugin-";
}

// apps/codex-plugin/src/auth/profile.mjs
async function brokerProfile(build, home = homedir()) {
  const prefix = installationPrefix(build);
  if (!["local", "qa", "production"].includes(build.profile))
    throw Error("Invalid profile");
  const origin = new URL(build.coreOrigin);
  if (origin.origin !== build.coreOrigin || origin.protocol !== "https:" && !(build.profile === "local" && origin.protocol === "http:" && ["127.0.0.1", "localhost"].includes(origin.hostname)))
    throw Error("Invalid Core origin");
  const account = createHash("sha256").update(
    JSON.stringify([build.profile, build.coreOrigin, build.runtimeClientId])
  ).digest("hex").slice(0, 40);
  const directory = join(
    home,
    ".local/share/kaijan/auth",
    account.slice(0, 20)
  );
  await mkdir(directory, { recursive: true, mode: 448 });
  const info = await lstat(directory);
  if (await realpath(directory) !== directory || info.uid !== process.getuid() || info.mode & 63)
    throw Error("Private broker state required");
  const identityPath = join(directory, "installation.json");
  try {
    await lstat(identityPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const temporary = join(directory, `.${randomUUID()}`);
    await writeFile(
      temporary,
      JSON.stringify({ installationId: `${prefix}${randomUUID()}` }),
      { mode: 384, flag: "wx" }
    );
    try {
      await link(temporary, identityPath);
    } catch (error2) {
      if (error2.code !== "EEXIST") throw error2;
    } finally {
      await unlink(temporary);
    }
  }
  const identityInfo = await lstat(identityPath);
  if (!identityInfo.isFile() || identityInfo.isSymbolicLink() || identityInfo.uid !== process.getuid() || identityInfo.mode & 63)
    throw Error("Unsafe installation identity");
  const identity = JSON.parse(await readFile(identityPath, "utf8"));
  if (typeof identity.installationId !== "string" || !identity.installationId.startsWith(prefix) || !/^[a-f0-9-]{36}$/.test(identity.installationId.slice(prefix.length)))
    throw Error("Invalid installation identity");
  const blockedPath = join(directory, "blocked.json");
  const state = {
    read: async () => {
      try {
        return JSON.parse(await readFile(blockedPath, "utf8")) === true;
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    },
    write: async (value) => {
      const temporary = join(directory, `.${randomUUID()}`);
      await writeFile(temporary, JSON.stringify(value), {
        mode: 384,
        flag: "wx"
      });
      await rename(temporary, blockedPath);
    }
  };
  return {
    directory,
    account,
    state,
    ...identity,
    socketPath: join(directory, "broker.sock")
  };
}

// apps/claude-plugin/src/onboarding-state.mjs
async function claimOnboarding(directory, sessionId) {
  try {
    await writeFile2(
      join2(directory, "claude-onboarding-offer.json"),
      JSON.stringify({ schema: "kaijan.claude-onboarding/1", sessionId }),
      { flag: "wx", mode: 384 }
    );
    return { start: true };
  } catch (error) {
    if (error.code === "EEXIST") return { start: false };
    throw error;
  }
}
async function offerSetup() {
  const desktop = process.argv[2] === "--desktop-session-start";
  let sessionId = process.argv[2];
  if (desktop) {
    if (process.env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop") return;
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString());
    if (input.source !== "startup") return;
    sessionId = input.session_id;
  }
  const build = resolveRuntimeBuild(
    JSON.parse(
      await readFile2(new URL("../loki-build.json", import.meta.url), "utf8")
    )
  );
  if (build.host !== "claude_code") throw Error("Claude package required");
  const profile = await brokerProfile(build);
  const offer = await claimOnboarding(profile.directory, sessionId);
  if (desktop) {
    if (offer.start)
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            initialUserMessage: `/${build.pluginName}:setup`
          }
        })
      );
  } else process.stdout.write(JSON.stringify(offer));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await offerSetup();
  } catch {
    process.stderr.write("Kaijan automatic setup is unavailable.\n");
    process.exitCode = 1;
  }
}
export {
  claimOnboarding
};
