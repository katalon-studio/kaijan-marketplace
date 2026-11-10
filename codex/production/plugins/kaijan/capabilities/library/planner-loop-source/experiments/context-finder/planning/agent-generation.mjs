import { Agent } from "@openai/agents-core";
import { createRetainedAgentRunner } from "@katalon-experiments/ai-client/agents";
import { createHash } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { generate } from "./pcf_provider.mjs";
import { readBytes, validationFailure } from "./pcf_records.mjs";

function need(condition, reason) {
  if (!condition) throw validationFailure(reason);
}

// Both tool-free phases return the capability owner's validated record.
export async function generateWithAgent(
  name,
  prepared,
  request,
  root,
  validate,
  options,
) {
  const phase =
    name === "Runner" || request.previous_response_id
      ? "assessment"
      : "supplement";
  let retained;
  const agent = new Agent({
    name,
    instructions: request.instructions,
    modelSettings: {
      reasoning: request.reasoning,
      ...(request.max_output_tokens === undefined
        ? {}
        : { maxTokens: request.max_output_tokens }),
    },
    outputType: request.text.format,
  });
  const runner = createRetainedAgentRunner({
    model: request.model,
    store: request.store,
    dispatch: async (body) => {
      const expected = {
        ...request,
        input: Array.isArray(request.input)
          ? request.input
          : [{ role: "user", content: request.input }],
        include: [],
        tools: [],
        stream: false,
      };
      need(
        isDeepStrictEqual(JSON.parse(JSON.stringify(body)), expected),
        `${phase}_sdk_request_changed`,
      );
      // The native serializer owns the request-size check and archive.
      retained = await generate(prepared, request, root, validate, options);
      const original = readBytes(path.join(root, "response.bin"));
      need(
        createHash("sha256").update(original).digest("hex") ===
          retained.receipt.captured_sha256,
        `retained_${phase}_response_changed`,
      );
      // Present the same text that the native validator accepted, including
      // output split across messages. Keep archived bytes and receipts intact.
      const response = JSON.parse(original.toString("utf8"));
      const text = response.output
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text)
        .join("");
      return {
        ...response,
        // The native reader has already rejected a populated error.
        error: null,
        output: [
          {
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text }],
          },
        ],
      };
    },
  });
  // The native owner observes Stop even before dispatch and saves its receipt.
  // An SDK-level abort would return early without that record.
  const input = Array.isArray(request.input)
    ? request.input.map((item) => ({ type: "unknown", providerData: item }))
    : request.input;
  await runner.run(agent, input, {
    maxTurns: 1,
    ...(request.previous_response_id
      ? { previousResponseId: request.previous_response_id }
      : {}),
  });
  need(retained, `${name.toLowerCase()}_finished_without_retained_${phase}`);
  return retained;
}
