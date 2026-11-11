import { filterComments } from "./planning/pcf_comment_origin.mjs";
export async function commentOrigin(
  records,
  enabled = true,
  signal,
  env = process.env,
) {
  void env;
  signal?.throwIfAborted();
  const fail = () =>
    Object.assign(Error("comment_origin_unavailable"), {
      code: "comment_origin_unavailable",
    });
  if (typeof enabled !== "boolean" || !Array.isArray(records)) throw fail();
  if (!records.length) return { records, decisions: [] };
  try {
    const raw = JSON.stringify({ records, enabled });
    if (Buffer.byteLength(raw) > 3 * 8454144) throw fail();
    const input = JSON.parse(raw);
    const [, decisions] = filterComments(input.records, input.enabled);
    if (Buffer.byteLength(JSON.stringify({ decisions })) > 3 * 8454144)
      throw fail();
    signal?.throwIfAborted();
    if (
      decisions.length !== records.length ||
      decisions.some(
        (d) =>
          d?.role !== "comment" ||
          !["retain", "quarantine"].includes(d.decision) ||
          d.comment_origin?.enabled !== enabled,
      )
    )
      throw fail();
    return {
      records: records.filter((_, i) => decisions[i].decision === "retain"),
      decisions,
    };
  } catch {
    throw fail();
  }
}
