import { LIMITS } from "./assessment-contract.mjs";

const objectSchema = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

// Keep each selected record and its model-supplied citation together. These
// constraints establish source membership only, never semantic support.
export function findingRecordLinkSchemas(prepared) {
  const sources = new Map(
    prepared.capture.state.suppliedSources.map((source) => [source.id, source]),
  );
  const schemaFor = (records) => {
    const variants = records.flatMap(({ id, sourceIds }) => {
      const groups = new Map();
      for (const sourceId of new Set(sourceIds)) {
        const count = sources.get(sourceId)?.lines.length;
        if (!count) continue;
        if (!groups.has(count)) groups.set(count, []);
        groups.get(count).push(sourceId);
      }
      if (!groups.size) return [];
      return [
        objectSchema({
          record_id: { type: "string", enum: [id] },
          citations: {
            type: "array",
            minItems: 1,
            maxItems: LIMITS.citations,
            items: {
              anyOf: [...groups].map(([count, ids]) =>
                objectSchema({
                  source_id: { type: "string", enum: ids },
                  from_line: { type: "integer", minimum: 1, maximum: count },
                  through_line: { type: "integer", minimum: 1, maximum: count },
                }),
              ),
            },
          },
        }),
      ];
    });
    return {
      type: "array",
      maxItems: variants.length,
      items: variants.length ? { anyOf: variants } : { type: "null" },
    };
  };
  const testIds = [
    ...new Set([
      ...prepared.tests.map((test) => test.id),
      ...prepared.outcomes.map((outcome) => outcome.test_id).filter(Boolean),
    ]),
  ];
  return {
    requirement_refs: schemaFor(
      prepared.requirements.map((record) => ({
        id: record.id,
        sourceIds: record.source_ids,
      })),
    ),
    test_refs: schemaFor(
      testIds.map((id) => ({
        id,
        sourceIds: [
          ...prepared.tests
            .filter((test) => test.id === id)
            .map((test) => test.source_id),
          ...prepared.outcomes
            .filter((outcome) => outcome.test_id === id)
            .map((outcome) => outcome.source_id),
        ],
      })),
    ),
    outcome_refs: schemaFor(
      prepared.outcomes.map((record) => ({
        id: record.id,
        sourceIds: [record.source_id],
      })),
    ),
  };
}

// Adapt explicit returned references for the existing strict binder. Do not
// look up citations, fill omitted references, or change the finding's claim.
export function flattenFindingRecordLinks(finding) {
  // The transport codec returns ordered proxies. The schema has already
  // validated this JSON; copy its values for the existing literal binder.
  const { requirement_refs, test_refs, outcome_refs, ...rest } = JSON.parse(
    JSON.stringify(finding),
  );
  const groups = [requirement_refs, test_refs, outcome_refs];
  const citations = [
    ...rest.citations,
    ...groups.flatMap((refs) => refs.flatMap((ref) => ref.citations)),
  ];
  return {
    ...structuredClone(rest),
    requirement_ids: requirement_refs.map((ref) => ref.record_id),
    test_ids: test_refs.map((ref) => ref.record_id),
    outcome_ids: outcome_refs.map((ref) => ref.record_id),
    citations: [
      ...new Map(
        citations.map((citation) => [
          JSON.stringify(citation),
          structuredClone(citation),
        ]),
      ).values(),
    ],
  };
}
