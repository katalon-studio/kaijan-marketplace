import type { RunnerAnswerOutput } from "./runner-answer-contracts.mjs";
import type { RunnerOutput } from "./runner-contracts.mjs";
export { runnerOutputSchema, runnerOperationSchema, runnerErrorSchema, runnerResultSchema, runnerNativeResultSchema, runnerExecutionReportSchema, runnerRecoverySchema, runnerClarificationSchema, } from "./runner-contracts.mjs";
export type { RunnerOutput, RunnerOperation, RunnerError, RunnerResult, RunnerNativeResult, } from "./runner-contracts.mjs";
/** Ordinary Node callers use the same implementation. Private host bindings and
 * test hooks remain owned by the capability host, outside this client entry. */
export interface RunnerClientOptions {
    model?: "gpt-6.1-terra" | "gpt-6-luna";
    reasoning?: "none" | "low" | "medium" | "high" | "xhigh" | "max";
    /** Browser only. False keeps the requested effort fixed. */
    effortRecovery?: boolean;
    apiKey?: string;
    operationScope?: string;
    legacyOperationDirectory?: string;
}
export interface RunnerClient {
    prepareReuse(input: unknown): Promise<Record<string, unknown>>;
    start(input: unknown): Promise<RunnerOutput>;
    get(input: unknown): Promise<RunnerOutput>;
    stop(input: unknown): Promise<RunnerOutput>;
    answer(input: unknown): Promise<RunnerAnswerOutput>;
}
export declare const ComputerRunner: new (data: string, options?: RunnerClientOptions) => RunnerClient;
export { runnerAnswer, runnerAnswerOutput } from "./runner-answer-contracts.mjs";
export type { RunnerAnswerOutput } from "./runner-answer-contracts.mjs";
