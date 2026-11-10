---
name: test-execution
description: Execute a complete caller-authorized browser scenario through standalone Runner, read original outcomes and evidence, or Stop that execution. Use only with explicit target/action authority; not for proposing tests or non-browser verification.
---

# Execute an explicit browser scenario

1. Check `loki_capabilities_list` for computerRunner provisioning. Resolve the
   authorized initial URL, actions and actual friendly parameter values. Planning
   grants no execution permission. Existing sessions, memory and credential
   references are unsupported. Do not inspect unrelated profiles or histories.
2. Call `loki_runner_execute` with one stable `requestKey`, exact `scenarioId`,
   full `scenario`, explicit `params` ({} when empty), and `target.initialURL`.
   Prefer the complete structured test so its prerequisites, steps, expected
   authority/hypotheses and execution gaps stay intact. IDs and optional planRef
   are correlation only. Declare unresolvedInputs rather than dispatch missing
   values. Browser UI is the supported executionMethod; other methods return
   not-executed. See RUNNER.md in the plugin root for the full contract.
3. Read `loki_runner_get` until the operation settles. Follow ordered resultRead
   chunks to recover exact JSON. Preserve nativeResult, including executionState,
   unverified testVerdict, terminal reason, fees, unknown usage and cleanup.
   Finished is a retained receipt; a model claim is not an independently verified
   pass. Raw traces/provider requests/browser state remain private references.
4. Use a fresh UUID for a new execution. A lost reply reuses the same key and full input.
   On request_key_conflict the rejected call did not dispatch. Inspect the
   existingRunId when resuming; use the suggested fresh key only for a separate
   authorized execution. Reconnect/get never execute.
   Never replace or replay unknown effects. Honor Stop with `loki_runner_stop`,
   then read actual cancellation, partial evidence and cleanup. Stop requested
   does not prove remote computation or billing ended.
   Browser provider transient HTTP responses retry quietly within the same request
   (three attempts, 1s/2s backoff, Retry-After capped at 30s). Stop/deadline interrupt
   waits and body reads. Keep every attempt's original usage/unknown charges;
   never restart the run or repeat browser actions to recover a provider failure.
   Uncertain transport, incomplete bodies and invalid/auth errors do not retry.
5. For requested assessment, explicitly combine assessmentFragment with original
   work_item, requirements and proposed_tests (or null) under
   work-verifier/supplied-test-evidence/1, then use the test-evidence skill.
   Reference-only traces remain unresolved. Retain the native unverified label;
   do not invent pass/fail, expected results, authenticated provenance or missing
   artifact content. Execution and assessment are separate explicit operations.

For detailed local review, Runner tracing is on by default. If trace.saved is
true, open nativeResult.trace.path from the package root with its pinned tools:

```sh
./runtime/node node_modules/playwright-core/cli.js show-trace \
  --host 127.0.0.1 --port 0 "/absolute/path/from/nativeResult.trace.path"
```

Keep the viewer process alive while reviewing its task tab; close that tab and
stop only that viewer process afterward. Keep raw traces local. Browser trace
content and provider HTTP/request records are separate. Each execution has an
isolated Node API worker; worker loss/host disconnect preserves partial evidence
and never licenses replay. Inspect executionHost and the private worker receipt
when the IPC handoff is uncertain.
