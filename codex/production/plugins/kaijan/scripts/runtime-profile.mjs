import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

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

// apps/codex-plugin/scripts/runtime-profile.mjs
var runtimeProfileVariable = "KAIJAN_PROFILE";
var runtimeProfileMode = "runtime-env/1";
var RuntimeProfileError = class extends Error {
  constructor(message) {
    super(message);
    this.code = "runtime_profile_invalid";
  }
};
function supportsProfile(build, profile) {
  return build.profileMode === runtimeProfileMode ? ["qa", "production"].includes(profile) && build.profile === "production" : build.profile === profile;
}
function resolveRuntimeBuild(build, env = process.env) {
  if (build.profileMode !== runtimeProfileMode) return build;
  if (build.profile !== "production" || build.authArchitecture !== "shared-broker-v1" || build.host && build.host !== "codex")
    throw Error("Invalid runtime-profile package.");
  const requested = env[runtimeProfileVariable];
  const profile = requested === void 0 || requested === "prod" ? "production" : requested;
  if (!["production", "qa"].includes(profile))
    throw new RuntimeProfileError(
      "Set KAIJAN_PROFILE to qa or production, or unset it for Production."
    );
  const selected = profiles_default[profile];
  if (env.LOKI_CORE_ORIGIN && env.LOKI_CORE_ORIGIN !== selected.coreOrigin)
    throw new RuntimeProfileError(
      "KAIJAN_PROFILE and LOKI_CORE_ORIGIN differ."
    );
  return {
    ...build,
    profile,
    coreOrigin: selected.coreOrigin,
    mcpUrl: `${selected.coreOrigin}/mcp`,
    oauthClientId: selected.oauthClientId
  };
}
export {
  RuntimeProfileError,
  resolveRuntimeBuild,
  runtimeProfileMode,
  runtimeProfileVariable,
  supportsProfile
};
