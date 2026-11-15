import { register as report } from "./register.mjs";
import { register as modDemo } from "./mod-demo/register.tsx";
import { createQaDemoState, registerQaDemos } from "./qa-demos.mjs";
import {
  createRunInterruptionState,
  registerRunInterruption,
} from "./run-interruption.mjs";
import { reportServer, reportToolPrefix } from "./report-config.mjs";

// Claude admits one hook module per plugin. Keep each feature's handlers in its
// own source while registering both through that one host entry point.
export function register(on) {
  const runInterruption = createRunInterruptionState();
  registerRunInterruption(
    on,
    { server: reportServer, prefix: reportToolPrefix },
    runInterruption,
  );
  report(on, runInterruption);
  const qaDemos = createQaDemoState();
  registerQaDemos(on, qaDemos);
  modDemo(on, qaDemos);
}
