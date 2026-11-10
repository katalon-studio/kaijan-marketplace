// Identical-subtree sharing matches the selected planner serializer.
// It changes only the outgoing schema; keep local validators fully expanded.
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function compactRequestSchema(schema) {
  const counts = new Map();
  let hasReferences = false;
  const children = (node, visit) => {
    const result = structuredClone(node);
    for (const key of ["properties", "$defs", "definitions"])
      if (object(node[key]))
        result[key] = Object.fromEntries(
          Object.entries(node[key]).map(([name, value]) => [
            name,
            visit(value),
          ]),
        );
    for (const key of ["items", "additionalProperties", "not"])
      if (object(node[key])) result[key] = visit(node[key]);
    for (const key of ["anyOf", "oneOf", "allOf", "prefixItems"])
      if (Array.isArray(node[key])) result[key] = node[key].map(visit);
    return result;
  };
  const shareable = (node) =>
    object(node.properties) ||
    Array.isArray(node.anyOf) ||
    Array.isArray(node.enum);
  const count = (node) => {
    if (!object(node)) return node;
    // Existing reference scopes need their own resolver. Never relocate them.
    if (Object.keys(node).some((key) => key.startsWith("$")))
      hasReferences = true;
    if (shareable(node)) {
      const key = JSON.stringify(node);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    children(node, count);
    return node;
  };
  count(schema);
  if (hasReferences) return schema;
  const definitions = {},
    names = new Map();
  const compact = (node, root = false) => {
    if (!object(node)) return node;
    const key = JSON.stringify(node);
    if (!root && shareable(node) && counts.get(key) > 1) {
      let name = names.get(key);
      if (!name) {
        name = `part_${names.size}`;
        names.set(key, name);
        definitions[name] = children(node, (child) => compact(child));
      }
      return { $ref: `#/$defs/${name}` };
    }
    return children(node, (child) => compact(child));
  };
  const result = compact(schema, true);
  return Object.keys(definitions).length
    ? { ...result, $defs: definitions }
    : result;
}
