// Keep the host vocabulary separate from the wire identifiers used by Core
// and saved operation records. Only retained tools have renamed aliases.
const publicNames = new Map([
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
  ["kaijan_project_history", "kaijan_project_history_manage"],
]);
const operationNames = new Map(
  [...publicNames].map(([operationName, publicName]) => [
    publicName,
    operationName,
  ]),
);

export const publicToolName = (name) => publicNames.get(name) ?? name;
export const operationToolName = (name) => operationNames.get(name) ?? name;

export function advertisedToolName(names, operation) {
  const name = publicToolName(operation);
  return names.has(name) ? name : operation;
}
