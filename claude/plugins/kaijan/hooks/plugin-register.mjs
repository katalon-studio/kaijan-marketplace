import { register as report } from "./register.mjs";
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
}
