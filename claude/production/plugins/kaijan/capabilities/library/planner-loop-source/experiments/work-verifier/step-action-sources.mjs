const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const need = (value) => {
  if (!value) throw new Error("Invalid assessment action catalog");
};

// Exact contiguous ranges avoid repeating a numeric enum for every action in a
// long ledger. Gaps remain separate choices; no missing action index is added.
function indexSchema(indexes) {
  const sorted = [...indexes].sort((a, b) => a - b);
  const ranges = [];
  for (const index of sorted) {
    const last = ranges.at(-1);
    if (last && index === last.maximum + 1) last.maximum = index;
    else ranges.push({ type: "integer", minimum: index, maximum: index });
  }
  return ranges.length === 1 ? ranges[0] : { anyOf: ranges };
}

/** Generation choices only. The caller must supply the host-derived catalog for
 * this exact outcome group. Literal binding still uses original input records.
 * Identity membership does not promote an invoked/error action to a success. */
export function constrainStepActionSources(schema, actions) {
  need(Array.isArray(actions));
  const bySource = new Map();
  for (const action of actions) {
    need(
      record(action) &&
        typeof action.source_id === "string" &&
        action.source_id.length > 0 &&
        Number.isSafeInteger(action.action_index) &&
        action.action_index >= 1,
    );
    if (!bySource.has(action.source_id))
      bySource.set(action.source_id, new Set());
    bySource.get(action.source_id).add(action.action_index);
  }
  const constrained = structuredClone(schema);
  // Historical flat step schemas are not changed by this generation helper.
  if (!Array.isArray(constrained.anyOf)) return constrained;
  constrained.anyOf = constrained.anyOf.filter((variant) => {
    if (variant.properties.qualification.enum[0] !== "recorded_action")
      return true;
    if (!bySource.size) return false;
    const refs = variant.properties.action_refs;
    need(
      record(refs.items?.properties) &&
        record(refs.items.properties.source_id) &&
        record(refs.items.properties.action_index),
    );
    const choices = [...bySource].map(([sourceId, indexes]) => {
      const item = structuredClone(refs.items);
      item.properties.source_id = { type: "string", enum: [sourceId] };
      item.properties.action_index = indexSchema(indexes);
      return item;
    });
    refs.items = choices.length === 1 ? choices[0] : { anyOf: choices };
    return true;
  });
  return constrained;
}
