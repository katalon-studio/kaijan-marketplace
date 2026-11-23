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
export {
  resolveRuntimeBuild
};
