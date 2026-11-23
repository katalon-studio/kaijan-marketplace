// apps/codex-plugin/src/mcp-tool-names.mjs
var publicNames = /* @__PURE__ */ new Map([
  ["loki_connection_status", "kaijan_connection_get"],
  ["loki_disconnect", "kaijan_connection_disconnect"],
  ["kaijan_connect", "kaijan_connection_connect"],
  ["kaijan_submit_feedback", "kaijan_feedback_submit"],
  ["kaijan_get_feedback", "kaijan_feedback_get"],
  ["kaijan_configuration", "kaijan_test_environment_manage"],
  ["loki_capabilities_list", "kaijan_capabilities_list"],
  ["loki_github_read", "kaijan_github_read"],
  ["loki_github_source_read", "kaijan_github_source_read"],
  ["kaijan_agent_feedback", "kaijan_agent_feedback_record"],
  ["loki_setup_list", "kaijan_app_config_list"],
  ["loki_setup_prepare", "kaijan_app_config_prepare"],
  ["loki_setup_get", "kaijan_app_config_get"],
  ["loki_setup_retry", "kaijan_app_config_retry"],
  ["loki_setup_resolve", "kaijan_app_config_resolve"],
  ["loki_advisory_result_read", "kaijan_result_read"],
  ["loki_test_plan", "kaijan_plan_create"],
  ["loki_test_execute", "kaijan_run_start"],
  ["loki_test_get", "kaijan_run_get"],
  ["loki_test_stop", "kaijan_run_stop"],
  ["loki_runner_answer", "kaijan_run_answer"],
  ["loki_runner_get", "kaijan_run_read_execution"],
  ["loki_runner_stop", "kaijan_run_stop_execution"],
  ["loki_report_show", "kaijan_report_show"],
  ["loki_report_get", "kaijan_report_get"],
  ["loki_report_artifact_read", "kaijan_report_read_artifact"],
  ["loki_report_trace", "kaijan_report_trace"],
  ["kaijan_project_history", "kaijan_project_history_manage"]
]);
var operationNames = new Map(
  [...publicNames].map(([operationName, publicName]) => [
    publicName,
    operationName
  ])
);
var publicToolName = (name) => publicNames.get(name) ?? name;

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
  const executeTools = [
    "loki_test_execute",
    publicToolName("loki_test_execute")
  ].map((name) => binding.prefix + name);
  const getTools = ["loki_test_get", publicToolName("loki_test_get")].map(
    (name) => binding.prefix + name
  );
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
  on(
    "tool.call",
    { tool: [...executeTools, ...getTools] },
    async (_$, event, next) => {
      const turn = state.current;
      const answer = await next(event);
      if (!state.active || !turn || state.current !== turn || state.generation !== turn.generation || event.agentId !== void 0 || answer.deny || answer.isError)
        return answer;
      const value = execution(answer.result);
      const runId = value?.runId;
      if (!value || typeof runId !== "string" || !/^[a-f0-9]{64}$/.test(runId))
        return answer;
      if (executeTools.includes(event.tool)) {
        if (value.state === "accepted" || value.state === "running")
          turn.runIds.add(runId);
        else if (value.state === "finished") turn.runIds.delete(runId);
      } else if ("runId" in event && event.runId === runId && value.state === "finished") {
        turn.runIds.delete(runId);
      }
      return answer;
    }
  );
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
            await $.mcp.call(binding.server, publicToolName("loki_test_stop"), {
              runId
            })
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
