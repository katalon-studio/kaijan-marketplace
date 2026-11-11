import fs from "node:fs";
import path from "node:path";
import { CommentFilter, save, FilterFailure } from "./pcf_comment_filter.mjs";
import { object } from "./semantics.mjs";
export async function selectParent(body, output_dir, options = {}) {
  let session;
  const result = { status: "incomplete", accounting: null };
  try {
    if (
      !object(body) ||
      body.model !== "jev-latest" ||
      !object(body.questions) ||
      Object.keys(body.questions).length < 1 ||
      Object.keys(body.questions).length > 12
    )
      throw new FilterFailure("parent_request_bound");
    session = new CommentFilter(output_dir, null, {
      ...options,
      max_calls: 1,
      mode: "jev",
    });
    save(path.join(output_dir, "parent-configuration.json"), {
      purpose: "semantic_parent_relevance_not_provenance",
      max_calls: 1,
      max_nominees: 12,
      max_request_bytes: null,
      timeout_seconds: 45,
      max_response_bytes: null,
      automatic_retry: false,
      transport:
        "CommentFilter.ask reused without apply; configuration.json describes borrowed transport, not actor or provenance verification",
      unknown_fee_or_usage: "stop_no_continuation",
    });
    const root = path.join(output_dir, "attempt-001");
    fs.mkdirSync(root, { mode: 0o700 });
    const raw = await session.ask(body, root);
    save(path.join(root, "first-response.json"), raw);
    const summary = session.summary();
    if (summary.unknown_cost_calls || summary.unknown_usage_calls)
      throw new FilterFailure("parent_unknown_accounting_no_continuation");
    Object.assign(result, { status: "complete", response: raw });
  } catch (error) {
    if (error?.uncaught) throw error;
  } finally {
    if (session) {
      const summary = session.summary();
      result.accounting = Object.fromEntries(
        [
          "calls",
          "known_cost_usd",
          "unknown_cost_calls",
          "unknown_usage_calls",
          "usage",
        ].map((key) => [key, summary[key]]),
      );
    }
  }
  return result;
}
