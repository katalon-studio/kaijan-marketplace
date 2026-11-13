---
name: test-execution
description: Run and assess a complete caller-authorized browser scenario, read its saved result, or Stop the same test. Use only with explicit target/action authority; planning remains separate.
---

# Run and assess an explicit browser scenario

1. Check `loki_capabilities_list` for computerRunner provisioning. Resolve the
   authorized initial URL, actions and actual friendly parameter values. Planning
   grants no execution permission. Existing sessions, memory and credential
   references are unsupported. Do not inspect unrelated profiles or histories.
2. Call `loki_test_execute` with one stable `requestKey`, exact `scenarioId`,
   full `scenario`, explicit `params` ({} when empty), and `target.initialURL`.
   Prefer the complete structured test so its prerequisites, steps, expected
   authority/hypotheses and execution gaps stay intact. IDs and optional planRef
   are correlation only. Declare unresolvedInputs rather than dispatch missing
   values. Browser UI is the supported executionMethod; other methods return
   not-executed. See RUNNER.md in the plugin root for the full contract.
3. Read `loki_test_get` until execution and assessment settle. Follow ordered resultRead
   chunks when needed to recover exact JSON. Keep the original Runner execution
   separate from its assessment and saved report. Preserve nativeResult, including executionState,
   unverified testVerdict, terminal reason, private accounting and cleanup.
   Finished is a retained receipt; a model claim is not an independently verified
   pass. Raw traces/provider requests/browser state remain private references.
4. Use a fresh UUID for a new execution. A lost reply reuses the same key and full input.
   On request_key_conflict the rejected call did not dispatch. Inspect the
   existingRunId when resuming; use the suggested fresh key only for a separate
   authorized execution. Reconnect/get never execute.
   Never replace or replay unknown effects. Honor Stop with `loki_test_stop`,
   then read actual cancellation, partial evidence and cleanup. Stop requested
   does not prove remote computation or billing ended.
   Browser provider transient HTTP responses retry quietly within the same request
   (three attempts, 1s/2s backoff, Retry-After capped at 30s). Stop/deadline interrupt
   waits and body reads. Keep every attempt's original usage/unknown charges;
   never restart the run or repeat browser actions to recover a provider failure.
   Uncertain transport, incomplete bodies and invalid/auth errors do not retry.
5. Read the assessment and saved report returned by this same test flow.
   Do not start a separate assessment to recover its result. Reference-only
   traces remain unresolved. Keep the native execution label separate from the
   assessment; do not invent pass/fail, expected results or missing artifacts.
   Use the test-evidence skill only for a separate request to review external evidence.

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
