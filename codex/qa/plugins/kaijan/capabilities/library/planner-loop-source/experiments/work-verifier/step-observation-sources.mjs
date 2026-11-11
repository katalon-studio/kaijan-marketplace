/** Match the literal step binder's accepted text sources. Image citations stay
 * available separately; an image caption is not text observed in its pixels. */
export function isStepObservationSource(source, evidenceIds) {
  if (
    !source ||
    typeof source.text !== "string" ||
    !source.text.length ||
    source.provenance?.role !== "evidence_text" ||
    !evidenceIds?.has(source.provenance.original_id)
  )
    return false;
  const reported = source.provenance.reported;
  const application =
    reported?.source === "application-evidence-projection" &&
    reported.schema === "kaijan.application-evidence/1" &&
    ["application-page", "application-artifact"].includes(reported.kind) &&
    reported.textSha256 === source.sha256;
  const caller =
    reported === null ||
    ["caller-assertion", "caller-supplied-runner-scenario"].includes(
      reported?.source,
    );
  return application || caller;
}

export function stepObservationSourceIds(sources, evidenceIds) {
  return sources
    .filter((source) => isStepObservationSource(source, evidenceIds))
    .map((source) => source.id);
}

/** Constrain new generation only. Do not alter saved inputs or candidates. */
export function constrainStepObservationSources(schema, sourceIds) {
  const constrained = structuredClone(schema);
  if (!Array.isArray(constrained.anyOf)) return constrained;
  constrained.anyOf = constrained.anyOf.filter((variant) => {
    const qualification = variant.properties.qualification.enum[0];
    if (qualification === "reported_observation" && !sourceIds.length)
      return false;
    const refs = variant.properties.source_refs;
    if (sourceIds.length)
      refs.items.properties.source_id = {
        type: "string",
        enum: [...sourceIds],
      };
    else refs.maxItems = 0;
    return true;
  });
  return constrained;
}
