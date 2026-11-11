import { z } from "zod";
export declare const runnerAnswer: z.ZodObject<{
    runId: z.ZodString;
    clarificationId: z.ZodString;
    answerKey: z.ZodString;
    answers: z.ZodRecord<z.ZodString, z.ZodString>;
    sensitiveQuestionIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
export declare const runnerAnswerReceipt: z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner.clarification-answer/1">;
    runId: z.ZodString;
    clarificationId: z.ZodString;
    answerKey: z.ZodString;
    status: z.ZodLiteral<"retained">;
}, z.core.$strict>;
export declare const runnerAnswerError: z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner.clarification-error/1">;
    runId: z.ZodString;
    clarificationId: z.ZodString;
    answerKey: z.ZodString;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            operation_unavailable: "operation_unavailable";
            answer_conflict: "answer_conflict";
            clarification_unavailable: "clarification_unavailable";
            invalid_answers: "invalid_answers";
            answer_effect_unestablished: "answer_effect_unestablished";
        }>;
    }, z.core.$strict>;
    requestDispatched: z.ZodNullable<z.ZodLiteral<false>>;
    recovery: z.ZodString;
}, z.core.$strict>;
export declare const runnerAnswerOutput: z.ZodUnion<readonly [z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner.clarification-answer/1">;
    runId: z.ZodString;
    clarificationId: z.ZodString;
    answerKey: z.ZodString;
    status: z.ZodLiteral<"retained">;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner.clarification-error/1">;
    runId: z.ZodString;
    clarificationId: z.ZodString;
    answerKey: z.ZodString;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            operation_unavailable: "operation_unavailable";
            answer_conflict: "answer_conflict";
            clarification_unavailable: "clarification_unavailable";
            invalid_answers: "invalid_answers";
            answer_effect_unestablished: "answer_effect_unestablished";
        }>;
    }, z.core.$strict>;
    requestDispatched: z.ZodNullable<z.ZodLiteral<false>>;
    recovery: z.ZodString;
}, z.core.$strict>]>;
export type RunnerAnswerOutput = z.infer<typeof runnerAnswerOutput>;
