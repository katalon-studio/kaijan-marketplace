import fs from "node:fs";
import path from "node:path";
import { check, RelatedError } from "./records.mjs";

export const credentialNames = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "LOKI_OPENROUTER_API_KEY",
  "GH_TOKEN",
  "GITHUB_TOKEN",
];

export function serviceScreen(service, env, signal, additionalNames = []) {
  const selected = [
    ...new Set([
      ...credentialNames.filter((name) => Boolean(env[name])),
      ...additionalNames,
    ]),
  ];
  const screen = async (value) => {
    signal.throwIfAborted();
    let result;
    try {
      result = await service.call("screen", {
        value,
        credentialNames: selected,
      });
    } catch {
      throw new RelatedError(
        signal.aborted ? "stopped" : "source_screen_unavailable",
      );
    }
    check(
      result?.contract === "pcf-source-screen/2",
      "source_screen_unavailable",
    );
    check(result.status === "clean", "source_privacy");
  };
  screen.declaration = {
    contract: "pcf-source-screen/2",
    credential_env_names: selected,
    policy: "exact-bound-values-and-URI-userinfo-password",
    unbound_credentials: "not_assessed",
  };
  return screen;
}

const write = (file, value) =>
  fs.writeFileSync(file, value, { flag: "wx", mode: 0o600 });

export function serviceFilter(
  service,
  root,
  policy,
  signal,
  report,
  mode,
  originEnabled,
) {
  fs.mkdirSync(root, { mode: 0o700 });
  let batches = 0,
    classificationStages = 0;
  const apply = async (records, label, classify = true, role = "evidence") => {
    signal.throwIfAborted();
    classify = classify && mode === "jev";
    check(!classify || classificationStages++ < 4, "comment_filter_call_bound");
    const raw = JSON.stringify(records);
    write(path.join(root, `input-${++batches}.json`), raw);
    let result;
    try {
      result = await service.call("filter", {
        raw,
        root: path.join(root, `filter-${batches}`),
        policy,
        label,
        classify,
        role,
        mode,
        originEnabled,
      });
    } catch (error) {
      if (classify)
        report({
          calls: 1,
          known_cost_usd: 0,
          unknown_cost_calls: 1,
          unknown_usage_calls: 1,
          records_examined: records.length,
          deterministic_only_records: 0,
          jev_classified_records: 0,
          retained_without_content_classification: 0,
          pending_records: records.length,
          policy_configured: null,
          note: "Worker outcome unavailable; reconcile dispatch artifacts, never replay.",
        });
      throw error;
    }
    write(
      path.join(root, `stdout-${batches}.txt`),
      JSON.stringify({
        status: result.status,
        accounting: result.accounting,
        ...(result.eligibility
          ? { eligibility: result.eligibility }
          : { downstream_allowed: false }),
      }) + "\n",
    );
    write(path.join(root, `stderr-${batches}.txt`), "");
    if (result.accounting) {
      report(result.accounting);
    }
    check(result.status === "complete", "comment_filter_incomplete");
    signal.throwIfAborted();
    apply.lastEligibility = result.eligibility;
    if (role === "subject") apply.subjectProvenance = result.eligibility;
    return result.records;
  };
  apply.mode = mode;
  apply.commentOriginFilter = originEnabled;
  return apply;
}

export function serviceParent(service, root, signal, report) {
  let attempted = false;
  return async (body) => {
    check(!attempted, "parent_selection_call_bound");
    attempted = true;
    signal.throwIfAborted();
    fs.mkdirSync(root, { mode: 0o700 });
    write(path.join(root, "input.json"), JSON.stringify(body));
    let result;
    try {
      result = await service.call("parent", {
        body,
        root: path.join(root, "native"),
      });
    } catch {
      /* Dispatch state/fees remain unknown without the canonical receipt. */
    }
    write(
      path.join(root, "stdout.json"),
      result ? JSON.stringify(result) + "\n" : "",
    );
    write(path.join(root, "stderr.txt"), "");
    report(
      result?.accounting ?? {
        calls: 1,
        known_cost_usd: 0,
        unknown_cost_calls: 1,
        unknown_usage_calls: 1,
        usage: null,
        note: "Worker outcome unavailable; dispatch/fees require reconciliation, no continuation.",
      },
    );
    check(
      result?.status === "complete" &&
        result.accounting &&
        !result.accounting.unknown_cost_calls &&
        !result.accounting.unknown_usage_calls,
      "parent_selection_incomplete_no_retry",
    );
    signal.throwIfAborted();
    return result.response;
  };
}
