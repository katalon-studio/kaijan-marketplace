import { runRelatedWorkPlanner } from "./related-work-planner.mjs";

export function selectQueryWithPlanner({ request, method, evaluate, select }) {
  return runRelatedWorkPlanner({
    request,
    evaluate,
    accept: select,
    requestChangedCode: "query_sdk_request_changed",
    isFallback: (profile) => profile.method !== method,
  });
}
