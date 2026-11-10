import { isDeepStrictEqual } from "node:util";
import { check } from "./records.mjs";
import { outputText } from "./rank.mjs";

// One tool-free turn. The host retains the original response and validates
// the query or ranking before its text enters the SDK.
export async function runRelatedWorkPlanner({
  request,
  evaluate,
  accept,
  requestChangedCode,
  isFallback,
}) {
  const { Agent } = await import("@openai/agents-core");
  const { createRetainedAgentRunner, RetainedResponseNotAdmitted } =
    await import("@katalon-experiments/ai-client/agents");
  const agent = new Agent({
    name: "Planner",
    modelSettings: {
      reasoning: request.reasoning,
      maxTokens: request.max_output_tokens,
    },
    outputType: request.text.format,
  });
  let accepted;
  const runner = createRetainedAgentRunner({
    model: request.model,
    store: request.store,
    async dispatch(wire) {
      check(
        isDeepStrictEqual(JSON.parse(JSON.stringify(wire)), {
          ...request,
          include: [],
          tools: [],
          stream: false,
        }),
        requestChangedCode,
      );
      const response = await evaluate();
      accepted = accept(response);
      if (isFallback?.(accepted))
        throw new RetainedResponseNotAdmitted(
          "The host selected the configured query fallback",
        );
      return {
        ...response,
        output: [
          {
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: outputText(response) }],
          },
        ],
      };
    },
  });
  try {
    await runner.run(
      agent,
      request.input.map((providerData) => ({ type: "unknown", providerData })),
      { maxTurns: 1 },
    );
  } catch (error) {
    // Earlier modes accept validated results on legacy response metadata.
    // A configured query fallback also belongs to the host.
    if (
      !(error instanceof RetainedResponseNotAdmitted) ||
      accepted === undefined
    )
      throw error;
  }
  return accepted;
}
