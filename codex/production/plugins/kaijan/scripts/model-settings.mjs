// Host command only. The MCP catalog does not expose this setter.
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import process from "node:process";
import { bindProfileState } from "./profile-state.mjs";

export async function modelSettingsCommand(root, state, args) {
  // Fixed installed library; no caller-selected module path.
  // eslint-disable-next-line no-restricted-syntax -- Fixed installed library beside this launcher.
  const library = await import(
    pathToFileURL(join(root, "capabilities/library/api.mjs")).href
  );
  const [command, ...values] = args;
  if (command === "runner") {
    if (
      ![2, 3].includes(values.length) ||
      (values[2] !== undefined && !["fixed", "recover"].includes(values[2]))
    )
      throw Error("Use models runner MODEL LEVEL [fixed|recover].");
    await library.setRunnerSettings(state, {
      model: values[0],
      reasoning: values[1],
      ...(values[2] === undefined
        ? {}
        : { effortRecovery: values[2] === "recover" }),
    });
  } else if (command === "analysis") {
    if (values.length !== 2)
      throw Error("Use models analysis gpt-6-luna|gpt-6.1-terra low|medium.");
    await library.setAnalysisSettings(state, {
      model: values[0],
      reasoning: values[1],
    });
  } else if (command === "reset" && values.length === 0) {
    await library.resetRunnerSettings(state);
    await library.setAnalysisSettings(state, library.defaultAnalysisSettings);
  } else if (command !== "show" || values.length) {
    throw Error(
      "Use models show, models runner MODEL LEVEL [fixed|recover], models analysis gpt-6-luna|gpt-6.1-terra low|medium, or models reset.",
    );
  }
  return {
    runner: await library.runnerSettings(state),
    supportedRunner: {
      browser: [
        { model: "gpt-6.1-terra", reasoning: ["low", "medium"] },
        {
          model: "gpt-6-luna",
          reasoning: ["none", "low", "medium", "high", "xhigh", "max"],
        },
      ],
      desktop: { model: "gpt-6.1-terra", reasoning: ["low", "medium"] },
      effortRecovery:
        "Browser only: fixed disables low-to-medium recovery; recover enables it (default).",
    },
    analysis: await library.analysisSettings(state),
    supportedAnalysis: {
      model: ["gpt-6-luna", "gpt-6.1-terra"],
      reasoning: ["low", "medium"],
    },
    analysisScope: [
      "code-change risk",
      "test planning",
      "test supplement",
      "supplied Assessment",
    ],
    fixedAnalysis: [
      "work-item risk",
      "related work",
      "UI Modeler",
      "JEV stages",
    ],
    precedence: {
      runner:
        "Explicit host options > LOKI_RUNNER_MODEL/LOKI_RUNNER_REASONING > saved settings > defaults",
      analysis:
        "Selected host environment LOKI_ANALYSIS_MODEL/LOKI_ANALYSIS_REASONING > saved settings > defaults",
    },
    applies:
      "New Runner and supported analysis operations only. Saved settings need no reconnect. Restart or reconnect the host after environment changes. Preserve admitted work and original receipts.",
  };
}

// Product MCP packages omit the legacy CLI launcher. Keep this host-only
// command runnable with the same bundled Node runtime as the MCP server.
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const root = resolve(import.meta.dirname, "..");
    let build = JSON.parse(
      await readFile(join(root, "loki-build.json"), "utf8"),
    );
    if (build.profileMode === "runtime-env/1") {
      const { resolveRuntimeBuild } = await import("./runtime-profile.mjs");
      build = resolveRuntimeBuild(build);
    }
    if (
      process.env.LOKI_CORE_ORIGIN &&
      process.env.LOKI_CORE_ORIGIN !== build.coreOrigin
    )
      throw Error("Select the matching installed profile.");
    const selected = await bindProfileState(
      build,
      process.argv.slice(2),
      homedir(),
    );
    const result = await modelSettingsCommand(
      root,
      selected.state,
      selected.args.slice(0, -4),
    );
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch {
    // Settings and arguments can contain private data. Do not echo them.
    process.stderr.write(
      "Model settings could not be validated. Use show, runner MODEL LEVEL [fixed|recover], analysis MODEL LEVEL, or reset. Check the selected profile and private state.\n",
    );
    process.exitCode = 1;
  }
}
