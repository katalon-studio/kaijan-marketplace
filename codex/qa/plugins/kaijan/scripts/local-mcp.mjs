import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// apps/codex-plugin/src/local-mcp-entry.mjs
import process from "node:process";
import {
  installedLocalMcp,
  BrokerRestartRequiredError
} from "./local-runtime.mjs";
installedLocalMcp().catch((error) => {
  const failure = error instanceof BrokerRestartRequiredError || error?.code === "runtime_profile_invalid" ? { code: error.code, message: error.message } : {
    code: "local_mcp_unavailable",
    message: "The fixed plugin profile, payload or private state could not be validated."
  };
  process.stderr.write(JSON.stringify({ error: failure }) + "\n");
  process.exitCode = 1;
});
