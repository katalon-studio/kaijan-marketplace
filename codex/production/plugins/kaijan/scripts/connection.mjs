import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// apps/codex-plugin/src/auth/connection-entry.mjs
import { readFile as readFile3 } from "node:fs/promises";
import { resolve, join as join3 } from "node:path";

// apps/codex-plugin/src/auth/client.mjs
import { spawn } from "node:child_process";

// apps/codex-plugin/src/auth/errors.mjs
var KeychainUnavailableError = class extends Error {
  constructor() {
    super(
      "Kaijan cannot read your saved sign-in from macOS Keychain. Use kaijan_connect to reconnect. If macOS asks for access, review its prompt. Your saved sign-in has not been removed."
    );
    this.name = "KeychainUnavailableError";
    this.code = "keychain_unavailable";
  }
};
var CredentialStorageUnavailableError = class extends KeychainUnavailableError {
  constructor(operation) {
    super();
    this.name = "CredentialStorageUnavailableError";
    this.code = "connection_unavailable";
    this.message = "Kaijan cannot access its saved sign-in. Check access to its private data folder, then reconnect.";
    this.operation = operation;
  }
};
var BrokerRestartRequiredError = class extends Error {
  constructor() {
    super(
      "Kaijan cannot use the sign-in service that is already running. Wait for Kaijan work in the affected profile to finish. Then follow Managed sign-in recovery in the Kaijan Setup guide."
    );
    this.name = "BrokerRestartRequiredError";
    this.code = "broker_restart_required";
  }
};

// apps/codex-plugin/src/auth/client.mjs
import {
  mkdir as mkdir2,
  readFile as readFile2,
  writeFile as writeFile2,
  rm,
  unlink as unlink2,
  lstat as lstat3
} from "node:fs/promises";
import { join as join2 } from "node:path";

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

// apps/codex-plugin/src/auth/channel.mjs
import { request } from "node:http";
import { Readable } from "node:stream";
import { lstat as lstat2 } from "node:fs/promises";
import { dirname } from "node:path";
async function checkChannel(socketPath) {
  const directory = await lstat2(dirname(socketPath));
  const socket = await lstat2(socketPath);
  if (!directory.isDirectory() || directory.isSymbolicLink() || directory.mode & 63 || directory.uid !== process.getuid() || !socket.isSocket() || socket.mode & 63 || socket.uid !== process.getuid())
    throw Error("unsafe_broker_channel");
}
async function channelFetch(socketPath, path, options = {}) {
  await checkChannel(socketPath);
  return new Promise((resolve2, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: options.method ?? "GET",
        headers: { "content-type": "application/json", ...options.headers },
        signal: options.signal
      },
      (res) => {
        const headers = new Headers();
        for (const name of [
          "content-type",
          "retry-after",
          "cache-control",
          "mcp-protocol-version"
        ]) {
          if (typeof res.headers[name] === "string")
            headers.set(name, res.headers[name]);
        }
        resolve2(
          new Response(
            [204, 205, 304].includes(res.statusCode) ? null : Readable.toWeb(res),
            { status: res.statusCode, headers }
          )
        );
      }
    );
    req.once("error", () => reject(Error("broker_unavailable_no_replay")));
    req.end(options.body);
  });
}

// apps/codex-plugin/src/auth/version.mjs
var brokerProtocol = 1;
function compareVersions(left, right) {
  const parse = (value) => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?$/.test(
      value ?? ""
    ))
      throw Error("invalid_broker_version");
    const [core, ...suffix] = value.split("-");
    return [core.split(".").map(BigInt), suffix.join("-").split(".")];
  };
  const [a, ap] = parse(left), [b, bp] = parse(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  if (!ap[0] || !bp[0]) return ap[0] === bp[0] ? 0 : ap[0] ? -1 : 1;
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    if (ap[i] === bp[i]) continue;
    if (ap[i] === void 0) return -1;
    if (bp[i] === void 0) return 1;
    const an = /^\d+$/.test(ap[i]), bn = /^\d+$/.test(bp[i]);
    if (an && bn) return BigInt(ap[i]) > BigInt(bp[i]) ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    return ap[i] > bp[i] ? 1 : -1;
  }
  return 0;
}
function brokerIdentity(build) {
  compareVersions(build.pluginVersion, build.pluginVersion);
  if (!build.buildId) throw Error("missing_broker_build");
  return {
    protocol: brokerProtocol,
    pluginVersion: build.pluginVersion,
    buildId: build.buildId,
    credentialStorage: build.credentialStorage ?? "keychain-v1"
  };
}
function brokerCompatibility(health, build) {
  const wanted = brokerIdentity(build);
  if (health.protocol !== wanted.protocol)
    throw new BrokerRestartRequiredError();
  const order = compareVersions(health.pluginVersion, wanted.pluginVersion);
  if (order >= 0 && wanted.credentialStorage === "private-file-v1" && health.credentialStorage !== wanted.credentialStorage)
    throw new BrokerRestartRequiredError();
  if (order === 0 && health.buildId !== wanted.buildId)
    throw Error(
      "broker_version_conflict: publish changed bytes with a new plugin version"
    );
  return order < 0 ? "upgrade" : "compatible";
}

// apps/codex-plugin/src/auth/client.mjs
var delay = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
async function connectBroker(root, build, { home, launch } = {}) {
  const profile = await brokerProfile(build, home);
  const probe = async () => {
    try {
      const r = await channelFetch(profile.socketPath, "/health", {
        signal: AbortSignal.timeout(1e3)
      });
      if (!r.ok) return null;
      const health = await r.json();
      return health.installationId === profile.installationId ? health : null;
    } catch {
      return null;
    }
  };
  const lock = join2(profile.directory, "startup.lock");
  const ready = async () => {
    let health = await probe();
    if (health && brokerCompatibility(health, build) === "compatible") return;
    let acquired = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      try {
        await mkdir2(lock, { mode: 448 });
        acquired = true;
        await writeFile2(join2(lock, "pid"), String(process.pid), {
          mode: 384
        });
        break;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        try {
          const pid = Number(await readFile2(join2(lock, "pid"), "utf8"));
          if (!Number.isSafeInteger(pid) || pid <= 0)
            throw Error("invalid_startup_owner", { cause: error });
          try {
            process.kill(pid, 0);
          } catch (error2) {
            if (error2.code === "ESRCH")
              await rm(lock, { recursive: true, force: true });
          }
        } catch (error2) {
          if (error2.code !== "ENOENT") throw error2;
          try {
            if (Date.now() - (await lstat3(lock)).mtimeMs > 1e4)
              await rm(lock, { recursive: true, force: true });
          } catch (error3) {
            if (error3.code !== "ENOENT") throw error3;
          }
        }
        health = await probe();
        if (health && brokerCompatibility(health, build) === "compatible")
          return;
        await delay(100);
      }
    }
    if (!acquired) throw Error("broker_startup_busy");
    try {
      health = await probe();
      if (health) {
        if (brokerCompatibility(health, build) === "compatible") return;
        const response = await channelFetch(profile.socketPath, "/upgrade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(brokerIdentity(build)),
          signal: AbortSignal.timeout(3e3)
        });
        const result = await response.json();
        if (response.status === 409 && result.error === "broker_busy") {
          if (build.credentialStorage === "private-file-v1" && health.credentialStorage !== build.credentialStorage)
            throw new BrokerRestartRequiredError();
          return;
        }
        if (!response.ok) throw Error("broker_upgrade_refused");
        for (let attempt = 0; attempt < 100 && await probe(); attempt++)
          await delay(100);
        if (await probe()) throw Error("broker_upgrade_pending");
      }
      try {
        const socket = await lstat3(profile.socketPath);
        if (!socket.isSocket() || socket.uid !== process.getuid())
          throw Error("unsafe_broker_socket");
        await unlink2(profile.socketPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (launch) await launch(profile, build);
      else {
        const child = spawn(
          process.execPath,
          [join2(root, "scripts/auth-broker.mjs")],
          {
            detached: true,
            stdio: "ignore"
          }
        );
        child.unref();
      }
      for (let attempt = 0; attempt < 100 && !await probe(); attempt++)
        await delay(100);
      health = await probe();
      if (!health || brokerCompatibility(health, build) !== "compatible")
        throw Error("broker_unavailable");
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  };
  await ready();
  const send = async (path, options) => {
    await ready();
    return channelFetch(profile.socketPath, path, options);
  };
  const control = async (path) => {
    const response = await send(path, {
      method: "POST",
      signal: AbortSignal.timeout(2e5)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (response.status === 503 && body?.error === "connection_unavailable" && body?.reason === "local_credential_storage")
        throw new CredentialStorageUnavailableError("connect");
      if (response.status === 503 && body?.error === "keychain_unavailable")
        throw new KeychainUnavailableError();
      throw Error(
        response.status === 401 ? "connection_required" : "broker_unavailable"
      );
    }
    return response.json();
  };
  return {
    ...profile,
    send,
    initialize: () => control("/initialize"),
    connect: () => control("/connect"),
    logout: () => control("/logout")
  };
}

// apps/codex-plugin/src/auth/connection-entry.mjs
var action = process.argv[2];
try {
  if (process.argv.length !== 3 || !["status", "connect", "logout", "stop"].includes(action))
    throw Error("Use status, connect, logout or stop");
  const root = resolve(import.meta.dirname, "..");
  const build = JSON.parse(
    await readFile3(join3(root, "loki-build.json"), "utf8")
  );
  if (action === "stop") {
    const profile = await brokerProfile(build);
    const health = await channelFetch(profile.socketPath, "/health", {
      signal: AbortSignal.timeout(1e3)
    });
    if (!health.ok || (await health.json()).installationId !== profile.installationId)
      throw Error("unexpected_broker_identity");
    const response = await channelFetch(profile.socketPath, "/shutdown", {
      method: "POST",
      signal: AbortSignal.timeout(3e3)
    });
    if (!response.ok) throw Error("broker_stop_failed");
    process.stdout.write(JSON.stringify(await response.json()) + "\n");
    process.exitCode = 0;
  } else {
    const broker = await connectBroker(root, build);
    const response = action === "connect" ? await broker.connect() : action === "logout" ? await broker.logout() : await (await broker.send("/health", {
      method: "GET"
    })).json();
    process.stdout.write(JSON.stringify(response) + "\n");
  }
} catch (error) {
  process.stderr.write(
    error instanceof BrokerRestartRequiredError ? `${error.code}: ${error.message}
` : "Connection action failed. No inference request was retried.\n"
  );
  process.exitCode = 1;
}
