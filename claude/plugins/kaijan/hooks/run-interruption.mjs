// apps/claude-plugin/hooks/run-interruption.ts
function execution(value, depth = 0) {
  if (depth > 4) return void 0;
  if (typeof value === "string") {
    try {
      return execution(JSON.parse(value), depth + 1);
    } catch {
      return void 0;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const row = value;
  if (row.isError || row.error) return void 0;
  if (row.schema === "kaijan.customer-execution/1" && row.kind === "test")
    return row;
  if (row.structuredContent) return execution(row.structuredContent, depth + 1);
  if (!Array.isArray(row.content)) return void 0;
  const content = row.content;
  const texts = content.filter(
    (block) => !!block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block && typeof block.text === "string"
  );
  return texts.length === 1 ? execution(texts[0]?.text, depth + 1) : void 0;
}
function createRunInterruptionState() {
  return { generation: 0, sequence: 0, active: true, current: void 0 };
}
function registerRunInterruption(on, binding, state) {
  const executeTool = `${binding.prefix}loki_test_execute`;
  const getTool = `${binding.prefix}loki_test_get`;
  on("turn.start", (_$, event, next) => {
    if (state.active && event.agentId === void 0)
      state.current = {
        id: event.turnId,
        generation: state.generation,
        sequence: ++state.sequence,
        runIds: /* @__PURE__ */ new Set()
      };
    return next(event);
  });
  on("tool.call", { tool: [executeTool, getTool] }, async (_$, event, next) => {
    const turn = state.current;
    const answer = await next(event);
    if (!state.active || !turn || state.current !== turn || state.generation !== turn.generation || event.agentId !== void 0 || answer.deny || answer.isError)
      return answer;
    const value = execution(answer.result);
    const runId = value?.runId;
    if (!value || typeof runId !== "string" || !/^[a-f0-9]{64}$/.test(runId))
      return answer;
    if (event.tool === executeTool) {
      if (value.state === "accepted" || value.state === "running")
        turn.runIds.add(runId);
      else if (value.state === "finished") turn.runIds.delete(runId);
    } else if ("runId" in event && event.runId === runId && value.state === "finished") {
      turn.runIds.delete(runId);
    }
    return answer;
  });
  on("turn.complete", async ($, event, next) => {
    const turn = state.current;
    if (!state.active || !turn || event.agentId !== void 0 || event.turnId !== turn.id || state.generation !== turn.generation)
      return next(event);
    state.current = void 0;
    if (!event.isAborted || event.reason !== "aborted") return next(event);
    let failed = false;
    await Promise.all(
      [...turn.runIds].map(async (runId) => {
        if (!state.active || state.generation !== turn.generation || state.sequence !== turn.sequence || state.current)
          return;
        try {
          const result = execution(
            await $.mcp.call(binding.server, "loki_test_stop", { runId })
          );
          if (!result || result.runId !== runId || result.stopRequested !== true && result.state !== "finished")
            failed = true;
        } catch {
          failed = true;
        }
      })
    );
    if (failed && state.active && state.generation === turn.generation && state.sequence === turn.sequence && !state.current) {
      try {
        $.ui.log(
          "Kaijan could not confirm the stop request. Ask Kaijan to stop the active test before starting another."
        );
      } catch {
      }
    }
    return next(event);
  });
}
export {
  createRunInterruptionState,
  registerRunInterruption
};
