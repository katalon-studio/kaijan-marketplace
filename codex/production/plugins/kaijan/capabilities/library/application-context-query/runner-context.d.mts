import type {
  ApplicationContextService,
  Json,
  Observation,
  ContextResult,
} from "./index.mjs";
export const runnerContextSchema: "loki.runner.application-context/1";
export interface ContextArguments {
  kind: "documentation" | "risk" | "map";
  question: string;
  sourceIds: string[] | null;
  cursor: string | null;
}
export interface ContextQueryFrame {
  schema: typeof runnerContextSchema;
  type: "application-context-query";
  invocationId: string;
  providerResponseId: string;
  callId: string;
  functionName: "application_context_query";
  arguments: ContextArguments;
  argumentsSha256: string;
  observations: { screen: Observation | null; path: Observation | null };
}
export interface ContextResultFrame {
  schema: typeof runnerContextSchema;
  type: "application-context-result";
  invocationId: string;
  resultJson: string;
  resultSha256: string;
}
export interface ContextErrorFrame {
  schema: typeof runnerContextSchema;
  type: "application-context-error";
  invocationId: string;
  code: string;
  disposition: "refused" | "unresolved";
  recovery?: {
    changedFields: ("kind" | "question" | "sourceIds")[];
    nextStep: "Repeat the original query choices with this cursor in a new tool call; do not replay unresolved invocations or unknown browser inputs.";
  };
}
export type ContextReplyFrame = ContextResultFrame | ContextErrorFrame;
export interface ContextRegistration {
  schema: typeof runnerContextSchema;
  descriptor: typeof applicationContextTool;
  runId: string;
  deadlineAt: string;
  outputBytes: number;
  bindingId: string;
  bindingSha256: string;
  serviceIdentity: string;
  descriptorSha256: string;
}
export const applicationContextTool: {
  readonly type: "function";
  readonly name: "application_context_query";
  readonly description: string;
  readonly strict: true;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, Json>>;
    readonly required: readonly string[];
    readonly additionalProperties: false;
  };
};
export class RunnerContextProtocolError extends Error {
  code: string;
  constructor(code: string);
}
export function validateApplicationContextArguments(
  value: unknown,
): ContextArguments;
export function applicationContextInvocationId(
  runId: string,
  value: Pick<
    ContextQueryFrame,
    "providerResponseId" | "callId" | "functionName" | "argumentsSha256"
  >,
): string;
export function createApplicationContextQuery(
  runId: string,
  value: Pick<
    ContextQueryFrame,
    | "providerResponseId"
    | "callId"
    | "functionName"
    | "arguments"
    | "observations"
  >,
): ContextQueryFrame;
export function validateApplicationContextQuery(
  runId: string,
  value: unknown,
): ContextQueryFrame;
export function validateApplicationContextReply(
  invocationId: string,
  value: unknown,
  outputBytes: number,
): ContextReplyFrame;
export function applicationContextServiceIdentity(): Promise<string>;
export function validateApplicationContextRegistration(
  value: unknown,
): ContextRegistration;
export interface RunnerApplicationContext {
  registration: ContextRegistration;
  configurationSha256: string;
  handle(
    frame: ContextQueryFrame,
    options?: { signal?: AbortSignal },
  ): Promise<ContextReplyFrame>;
}
export function createRunnerApplicationContext(options: {
  service: ApplicationContextService;
  signal?: AbortSignal;
  directory: string;
  callerId: string;
  runId: string;
  scenarioId: string | null;
  sourceBindingIds: string[];
  deadlineAt: string;
  queryMs: number;
  outputBytes: number;
  bindingId: string;
  bindingSha256: string;
}): Promise<RunnerApplicationContext>;
/** Result frames retain the complete original serialization, never a synthesized answer. */
export type OriginalContextResult = ContextResult;
