import { z } from "zod";
export declare const runnerExecutionReportSchema: z.ZodPreprocess<z.ZodUnion<readonly [z.ZodObject<{
    effects: z.ZodOptional<z.ZodEnum<{
        known: "known";
        uncertain: "uncertain";
    }>>;
    basis: z.ZodLiteral<"model-authored-unverified">;
    responseId: z.ZodString;
    callId: z.ZodString;
    reason: z.ZodString;
    completedSteps: z.ZodArray<z.ZodString>;
    remainingSteps: z.ZodArray<z.ZodString>;
    evidence: z.ZodArray<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        kind: z.ZodString;
        presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                "missing-value": "missing-value";
                "app-choice": "app-choice";
                permission: "permission";
                "task-scope": "task-scope";
            }>;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"read-only-path">;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            control: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>;
    }, z.core.$strict>>;
    schema: z.ZodLiteral<"loki.runner.execution-report/1">;
    status: z.ZodEnum<{
        complete: "complete";
        blocked: "blocked";
        needs_input: "needs_input";
        stuck: "stuck";
    }>;
}, z.core.$strict>, z.ZodObject<{
    reason: z.ZodString;
    status: z.ZodEnum<{
        complete: "complete";
        blocked: "blocked";
        needs_input: "needs_input";
        stuck: "stuck";
    }>;
    evidence: z.ZodArray<z.ZodString>;
    basis: z.ZodLiteral<"model-authored-unverified">;
    effects: z.ZodOptional<z.ZodEnum<{
        known: "known";
        uncertain: "uncertain";
    }>>;
    responseId: z.ZodString;
    callId: z.ZodString;
    remainingSteps: z.ZodArray<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        kind: z.ZodString;
        presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                "missing-value": "missing-value";
                "app-choice": "app-choice";
                permission: "permission";
                "task-scope": "task-scope";
            }>;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"read-only-path">;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            control: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>;
    }, z.core.$strict>>;
    schema: z.ZodLiteral<"loki.runner.execution-report/2">;
}, z.core.$strict>]>, unknown>;
export declare const runnerRecoverySchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    used: z.ZodBoolean;
    initialEffort: z.ZodEnum<{
        max: "max";
        none: "none";
        high: "high";
        low: "low";
        medium: "medium";
        xhigh: "xhigh";
    }>;
    currentEffort: z.ZodEnum<{
        max: "max";
        none: "none";
        high: "high";
        low: "low";
        medium: "medium";
        xhigh: "xhigh";
    }>;
    transitions: z.ZodArray<z.ZodObject<{
        responseId: z.ZodString;
        callId: z.ZodString;
        from: z.ZodEnum<{
            low: "low";
            medium: "medium";
        }>;
        to: z.ZodLiteral<"medium">;
        reason: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const runnerClarificationSchema: z.ZodObject<{
    deadlineAt: z.ZodString;
    state: z.ZodEnum<{
        unknown: "unknown";
        live: "live";
    }>;
    redaction: z.ZodOptional<z.ZodObject<{
        schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
        revision: z.ZodNumber;
    }, z.core.$strict>>;
    reason: z.ZodString;
    completedSteps: z.ZodArray<z.ZodString>;
    remainingSteps: z.ZodArray<z.ZodString>;
    evidence: z.ZodArray<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        kind: z.ZodString;
        presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                "missing-value": "missing-value";
                "app-choice": "app-choice";
                permission: "permission";
                "task-scope": "task-scope";
            }>;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"read-only-path">;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            control: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>;
    }, z.core.$strict>>;
    schema: z.ZodLiteral<"loki.runner.clarification/1">;
    clarificationId: z.ZodString;
}, z.core.$strict>;
/** Native fields are retained verbatim, including producer extensions. Execution
 * state and the model's verdict never imply independently verified user success. */
export declare const runnerNativeResultSchema: z.ZodObject<{
    correlation: z.ZodObject<{
        requestId: z.ZodString;
        scenarioId: z.ZodString;
        planRef: z.ZodOptional<z.ZodJSONSchema>;
    }, z.core.$loose>;
    executionState: z.ZodEnum<{
        unknown: "unknown";
        completed: "completed";
        blocked: "blocked";
        cancelled: "cancelled";
        incomplete: "incomplete";
    }>;
    testVerdict: z.ZodString;
    terminal: z.ZodObject<{
        executionReportProvenance: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            responseReference: z.ZodNullable<z.ZodObject<{
                path: z.ZodString;
                sha256: z.ZodString;
                bytes: z.ZodNumber;
            }, z.core.$strict>>;
            evidenceReferences: z.ZodArray<z.ZodObject<{
                path: z.ZodString;
                sha256: z.ZodString;
                bytes: z.ZodNumber;
                checkpointPath: z.ZodString;
            }, z.core.$strict>>;
            providerCall: z.ZodNumber;
        }, z.core.$strict>>>;
    }, z.core.$loose>;
    executionReport: z.ZodOptional<z.ZodNullable<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodObject<{
        effects: z.ZodOptional<z.ZodEnum<{
            known: "known";
            uncertain: "uncertain";
        }>>;
        basis: z.ZodLiteral<"model-authored-unverified">;
        responseId: z.ZodString;
        callId: z.ZodString;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.execution-report/1">;
        status: z.ZodEnum<{
            complete: "complete";
            blocked: "blocked";
            needs_input: "needs_input";
            stuck: "stuck";
        }>;
    }, z.core.$strict>, z.ZodObject<{
        reason: z.ZodString;
        status: z.ZodEnum<{
            complete: "complete";
            blocked: "blocked";
            needs_input: "needs_input";
            stuck: "stuck";
        }>;
        evidence: z.ZodArray<z.ZodString>;
        basis: z.ZodLiteral<"model-authored-unverified">;
        effects: z.ZodOptional<z.ZodEnum<{
            known: "known";
            uncertain: "uncertain";
        }>>;
        responseId: z.ZodString;
        callId: z.ZodString;
        remainingSteps: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.execution-report/2">;
    }, z.core.$strict>]>, unknown>>>;
    recovery: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        used: z.ZodBoolean;
        initialEffort: z.ZodEnum<{
            max: "max";
            none: "none";
            high: "high";
            low: "low";
            medium: "medium";
            xhigh: "xhigh";
        }>;
        currentEffort: z.ZodEnum<{
            max: "max";
            none: "none";
            high: "high";
            low: "low";
            medium: "medium";
            xhigh: "xhigh";
        }>;
        transitions: z.ZodArray<z.ZodObject<{
            responseId: z.ZodString;
            callId: z.ZodString;
            from: z.ZodEnum<{
                low: "low";
                medium: "medium";
            }>;
            to: z.ZodLiteral<"medium">;
            reason: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    effortAccounting: z.ZodOptional<z.ZodObject<{
        low: z.ZodNumber;
        medium: z.ZodNumber;
        none: z.ZodOptional<z.ZodNumber>;
        high: z.ZodOptional<z.ZodNumber>;
        xhigh: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$loose>;
export type RunnerNativeResult = z.infer<typeof runnerNativeResultSchema>;
export declare const runnerResultSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
    status: z.ZodLiteral<"reuse-not-executed">;
    reason: z.ZodString;
    nativeResult: z.ZodNull;
    assessmentFragment: z.ZodNull;
    reuse: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
    nativeDispatched: z.ZodLiteral<false>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
    status: z.ZodLiteral<"not-executed">;
    reason: z.ZodString;
    scenarioId: z.ZodString;
    unresolvedInputs: z.ZodArray<z.ZodString>;
    executionMethod: z.ZodString;
    nativeResult: z.ZodNull;
    assessmentFragment: z.ZodNull;
    providerCallsStarted: z.ZodLiteral<0>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
    status: z.ZodLiteral<"native-exception">;
    reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    nativeResult: z.ZodNull;
    assessmentFragment: z.ZodNull;
    effects: z.ZodLiteral<"unknown-do-not-replay">;
    partialHandoff: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
    privateFailure: z.ZodString;
    workerReceipt: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
    status: z.ZodLiteral<"returned">;
    reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    executionHost: z.ZodJSONSchema;
    nativeResult: z.ZodObject<{
        correlation: z.ZodObject<{
            requestId: z.ZodString;
            scenarioId: z.ZodString;
            planRef: z.ZodOptional<z.ZodJSONSchema>;
        }, z.core.$loose>;
        executionState: z.ZodEnum<{
            unknown: "unknown";
            completed: "completed";
            blocked: "blocked";
            cancelled: "cancelled";
            incomplete: "incomplete";
        }>;
        testVerdict: z.ZodString;
        terminal: z.ZodObject<{
            executionReportProvenance: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                responseReference: z.ZodNullable<z.ZodObject<{
                    path: z.ZodString;
                    sha256: z.ZodString;
                    bytes: z.ZodNumber;
                }, z.core.$strict>>;
                evidenceReferences: z.ZodArray<z.ZodObject<{
                    path: z.ZodString;
                    sha256: z.ZodString;
                    bytes: z.ZodNumber;
                    checkpointPath: z.ZodString;
                }, z.core.$strict>>;
                providerCall: z.ZodNumber;
            }, z.core.$strict>>>;
        }, z.core.$loose>;
        executionReport: z.ZodOptional<z.ZodNullable<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodObject<{
            effects: z.ZodOptional<z.ZodEnum<{
                known: "known";
                uncertain: "uncertain";
            }>>;
            basis: z.ZodLiteral<"model-authored-unverified">;
            responseId: z.ZodString;
            callId: z.ZodString;
            reason: z.ZodString;
            completedSteps: z.ZodArray<z.ZodString>;
            remainingSteps: z.ZodArray<z.ZodString>;
            evidence: z.ZodArray<z.ZodString>;
            questions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                question: z.ZodString;
                kind: z.ZodString;
                presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    kind: z.ZodEnum<{
                        "missing-value": "missing-value";
                        "app-choice": "app-choice";
                        permission: "permission";
                        "task-scope": "task-scope";
                    }>;
                    subject: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    choices: z.ZodArray<z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"read-only-path">;
                    subject: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    control: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    choices: z.ZodArray<z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strict>>;
            schema: z.ZodLiteral<"loki.runner.execution-report/1">;
            status: z.ZodEnum<{
                complete: "complete";
                blocked: "blocked";
                needs_input: "needs_input";
                stuck: "stuck";
            }>;
        }, z.core.$strict>, z.ZodObject<{
            reason: z.ZodString;
            status: z.ZodEnum<{
                complete: "complete";
                blocked: "blocked";
                needs_input: "needs_input";
                stuck: "stuck";
            }>;
            evidence: z.ZodArray<z.ZodString>;
            basis: z.ZodLiteral<"model-authored-unverified">;
            effects: z.ZodOptional<z.ZodEnum<{
                known: "known";
                uncertain: "uncertain";
            }>>;
            responseId: z.ZodString;
            callId: z.ZodString;
            remainingSteps: z.ZodArray<z.ZodString>;
            questions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                question: z.ZodString;
                kind: z.ZodString;
                presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    kind: z.ZodEnum<{
                        "missing-value": "missing-value";
                        "app-choice": "app-choice";
                        permission: "permission";
                        "task-scope": "task-scope";
                    }>;
                    subject: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    choices: z.ZodArray<z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"read-only-path">;
                    subject: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    control: z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>;
                    choices: z.ZodArray<z.ZodObject<{
                        sourceId: z.ZodString;
                        quote: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strict>>;
            schema: z.ZodLiteral<"loki.runner.execution-report/2">;
        }, z.core.$strict>]>, unknown>>>;
        recovery: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            used: z.ZodBoolean;
            initialEffort: z.ZodEnum<{
                max: "max";
                none: "none";
                high: "high";
                low: "low";
                medium: "medium";
                xhigh: "xhigh";
            }>;
            currentEffort: z.ZodEnum<{
                max: "max";
                none: "none";
                high: "high";
                low: "low";
                medium: "medium";
                xhigh: "xhigh";
            }>;
            transitions: z.ZodArray<z.ZodObject<{
                responseId: z.ZodString;
                callId: z.ZodString;
                from: z.ZodEnum<{
                    low: "low";
                    medium: "medium";
                }>;
                to: z.ZodLiteral<"medium">;
                reason: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        effortAccounting: z.ZodOptional<z.ZodObject<{
            low: z.ZodNumber;
            medium: z.ZodNumber;
            none: z.ZodOptional<z.ZodNumber>;
            high: z.ZodOptional<z.ZodNumber>;
            xhigh: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
    }, z.core.$loose>;
    executionConfig: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
    assessmentFragment: z.ZodObject<{
        outcomes: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        evidence: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        target: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        provenance: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
    }, z.core.$loose>;
    verification: z.ZodOptional<z.ZodObject<{
        planRef: z.ZodObject<{
            answerId: z.ZodString;
            resultSha256: z.ZodString;
        }, z.core.$strict>;
        repository: z.ZodString;
        sourceRevision: z.ZodString;
        pullRequestUrl: z.ZodNullable<z.ZodURL>;
        recordedAt: z.ZodISODateTime;
        provenance: z.ZodLiteral<"product-terminal-checks/1">;
        oracle: z.ZodString;
        evidence: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            sha256: z.ZodString;
        }, z.core.$strict>>;
        tests: z.ZodArray<z.ZodObject<{
            testId: z.ZodString;
            title: z.ZodString;
            status: z.ZodEnum<{
                skipped: "skipped";
                blocked: "blocked";
                fail: "fail";
                pass: "pass";
                "not-run": "not-run";
            }>;
            expected: z.ZodString;
            actual: z.ZodString;
            deliberateFailure: z.ZodBoolean;
            steps: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                status: z.ZodEnum<{
                    skipped: "skipped";
                    blocked: "blocked";
                    fail: "fail";
                    pass: "pass";
                    "not-run": "not-run";
                }>;
                expected: z.ZodString;
                actual: z.ZodString;
                evidenceIds: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
            code: z.ZodNullable<z.ZodObject<{
                path: z.ZodString;
                revision: z.ZodString;
                language: z.ZodString;
                text: z.ZodString;
                sha256: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    sourceContextId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>], "status">;
export type RunnerResult = z.infer<typeof runnerResultSchema>;
/** A live input request needs caller action, not another status poll. */
export declare const runnerNextActionSchema: z.ZodObject<{
    kind: z.ZodLiteral<"input-required">;
    tool: z.ZodLiteral<"loki_runner_answer">;
    runId: z.ZodString;
    clarificationId: z.ZodString;
    deadlineAt: z.ZodString;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        kind: z.ZodString;
        presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                "missing-value": "missing-value";
                "app-choice": "app-choice";
                permission: "permission";
                "task-scope": "task-scope";
            }>;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"read-only-path">;
            subject: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            control: z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>;
            choices: z.ZodArray<z.ZodObject<{
                sourceId: z.ZodString;
                quote: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>;
    }, z.core.$strict>>;
    instruction: z.ZodString;
}, z.core.$strict>;
export declare const runnerOperationSchema: z.ZodUnion<readonly [z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultSha256: z.ZodOptional<z.ZodString>;
    resultBytes: z.ZodOptional<z.ZodNumber>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodEnum<{
        unknown: "unknown";
        running: "running";
        accepted: "accepted";
        "not-started": "not-started";
        "stopped-before-start": "stopped-before-start";
    }>;
    resultValidated: z.ZodOptional<z.ZodLiteral<false>>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    result: z.ZodDiscriminatedUnion<[z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"reuse-not-executed">;
        reason: z.ZodString;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        reuse: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        nativeDispatched: z.ZodLiteral<false>;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"not-executed">;
        reason: z.ZodString;
        scenarioId: z.ZodString;
        unresolvedInputs: z.ZodArray<z.ZodString>;
        executionMethod: z.ZodString;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        providerCallsStarted: z.ZodLiteral<0>;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"native-exception">;
        reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        effects: z.ZodLiteral<"unknown-do-not-replay">;
        partialHandoff: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        privateFailure: z.ZodString;
        workerReceipt: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"returned">;
        reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        executionHost: z.ZodJSONSchema;
        nativeResult: z.ZodObject<{
            correlation: z.ZodObject<{
                requestId: z.ZodString;
                scenarioId: z.ZodString;
                planRef: z.ZodOptional<z.ZodJSONSchema>;
            }, z.core.$loose>;
            executionState: z.ZodEnum<{
                unknown: "unknown";
                completed: "completed";
                blocked: "blocked";
                cancelled: "cancelled";
                incomplete: "incomplete";
            }>;
            testVerdict: z.ZodString;
            terminal: z.ZodObject<{
                executionReportProvenance: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    responseReference: z.ZodNullable<z.ZodObject<{
                        path: z.ZodString;
                        sha256: z.ZodString;
                        bytes: z.ZodNumber;
                    }, z.core.$strict>>;
                    evidenceReferences: z.ZodArray<z.ZodObject<{
                        path: z.ZodString;
                        sha256: z.ZodString;
                        bytes: z.ZodNumber;
                        checkpointPath: z.ZodString;
                    }, z.core.$strict>>;
                    providerCall: z.ZodNumber;
                }, z.core.$strict>>>;
            }, z.core.$loose>;
            executionReport: z.ZodOptional<z.ZodNullable<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodObject<{
                effects: z.ZodOptional<z.ZodEnum<{
                    known: "known";
                    uncertain: "uncertain";
                }>>;
                basis: z.ZodLiteral<"model-authored-unverified">;
                responseId: z.ZodString;
                callId: z.ZodString;
                reason: z.ZodString;
                completedSteps: z.ZodArray<z.ZodString>;
                remainingSteps: z.ZodArray<z.ZodString>;
                evidence: z.ZodArray<z.ZodString>;
                questions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    question: z.ZodString;
                    kind: z.ZodString;
                    presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        kind: z.ZodEnum<{
                            "missing-value": "missing-value";
                            "app-choice": "app-choice";
                            permission: "permission";
                            "task-scope": "task-scope";
                        }>;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"read-only-path">;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        control: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>]>>;
                }, z.core.$strict>>;
                schema: z.ZodLiteral<"loki.runner.execution-report/1">;
                status: z.ZodEnum<{
                    complete: "complete";
                    blocked: "blocked";
                    needs_input: "needs_input";
                    stuck: "stuck";
                }>;
            }, z.core.$strict>, z.ZodObject<{
                reason: z.ZodString;
                status: z.ZodEnum<{
                    complete: "complete";
                    blocked: "blocked";
                    needs_input: "needs_input";
                    stuck: "stuck";
                }>;
                evidence: z.ZodArray<z.ZodString>;
                basis: z.ZodLiteral<"model-authored-unverified">;
                effects: z.ZodOptional<z.ZodEnum<{
                    known: "known";
                    uncertain: "uncertain";
                }>>;
                responseId: z.ZodString;
                callId: z.ZodString;
                remainingSteps: z.ZodArray<z.ZodString>;
                questions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    question: z.ZodString;
                    kind: z.ZodString;
                    presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        kind: z.ZodEnum<{
                            "missing-value": "missing-value";
                            "app-choice": "app-choice";
                            permission: "permission";
                            "task-scope": "task-scope";
                        }>;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"read-only-path">;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        control: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>]>>;
                }, z.core.$strict>>;
                schema: z.ZodLiteral<"loki.runner.execution-report/2">;
            }, z.core.$strict>]>, unknown>>>;
            recovery: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                used: z.ZodBoolean;
                initialEffort: z.ZodEnum<{
                    max: "max";
                    none: "none";
                    high: "high";
                    low: "low";
                    medium: "medium";
                    xhigh: "xhigh";
                }>;
                currentEffort: z.ZodEnum<{
                    max: "max";
                    none: "none";
                    high: "high";
                    low: "low";
                    medium: "medium";
                    xhigh: "xhigh";
                }>;
                transitions: z.ZodArray<z.ZodObject<{
                    responseId: z.ZodString;
                    callId: z.ZodString;
                    from: z.ZodEnum<{
                        low: "low";
                        medium: "medium";
                    }>;
                    to: z.ZodLiteral<"medium">;
                    reason: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
            effortAccounting: z.ZodOptional<z.ZodObject<{
                low: z.ZodNumber;
                medium: z.ZodNumber;
                none: z.ZodOptional<z.ZodNumber>;
                high: z.ZodOptional<z.ZodNumber>;
                xhigh: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
        }, z.core.$loose>;
        executionConfig: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        assessmentFragment: z.ZodObject<{
            outcomes: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
            evidence: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
            target: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
            provenance: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        }, z.core.$loose>;
        verification: z.ZodOptional<z.ZodObject<{
            planRef: z.ZodObject<{
                answerId: z.ZodString;
                resultSha256: z.ZodString;
            }, z.core.$strict>;
            repository: z.ZodString;
            sourceRevision: z.ZodString;
            pullRequestUrl: z.ZodNullable<z.ZodURL>;
            recordedAt: z.ZodISODateTime;
            provenance: z.ZodLiteral<"product-terminal-checks/1">;
            oracle: z.ZodString;
            evidence: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
                sha256: z.ZodString;
            }, z.core.$strict>>;
            tests: z.ZodArray<z.ZodObject<{
                testId: z.ZodString;
                title: z.ZodString;
                status: z.ZodEnum<{
                    skipped: "skipped";
                    blocked: "blocked";
                    fail: "fail";
                    pass: "pass";
                    "not-run": "not-run";
                }>;
                expected: z.ZodString;
                actual: z.ZodString;
                deliberateFailure: z.ZodBoolean;
                steps: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    status: z.ZodEnum<{
                        skipped: "skipped";
                        blocked: "blocked";
                        fail: "fail";
                        pass: "pass";
                        "not-run": "not-run";
                    }>;
                    expected: z.ZodString;
                    actual: z.ZodString;
                    evidenceIds: z.ZodArray<z.ZodString>;
                }, z.core.$strict>>;
                code: z.ZodNullable<z.ZodObject<{
                    path: z.ZodString;
                    revision: z.ZodString;
                    language: z.ZodString;
                    text: z.ZodString;
                    sha256: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        sourceContextId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>], "status">;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    resultRead: z.ZodObject<{
        nextOffset: z.ZodLiteral<0>;
        totalCharacters: z.ZodNumber;
        instruction: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    resultChunk: z.ZodObject<{
        encoding: z.ZodLiteral<"JSON text, UTF-16 offsets">;
        offset: z.ZodNumber;
        text: z.ZodString;
        nextOffset: z.ZodNullable<z.ZodNumber>;
        totalCharacters: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>]>;
export type RunnerOperation = z.infer<typeof runnerOperationSchema>;
export declare const runnerErrorSchema: z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-error/1">;
    method: z.ZodEnum<{
        stop: "stop";
        get: "get";
        execute: "execute";
    }>;
    runId: z.ZodOptional<z.ZodString>;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            invalid_arguments: "invalid_arguments";
            request_key_conflict: "request_key_conflict";
            operation_not_found_in_scope: "operation_not_found_in_scope";
            operation_unavailable: "operation_unavailable";
            private_parameter_invalid: "private_parameter_invalid";
            private_parameter_unavailable: "private_parameter_unavailable";
            private_parameter_scope_mismatch: "private_parameter_scope_mismatch";
            private_parameter_target_mismatch: "private_parameter_target_mismatch";
            private_parameter_collision: "private_parameter_collision";
            private_parameter_revoked: "private_parameter_revoked";
        }>;
        message: z.ZodString;
        requestDispatched: z.ZodNullable<z.ZodBoolean>;
        recovery: z.ZodObject<{
            action: z.ZodString;
            instruction: z.ZodString;
            requestKey: z.ZodOptional<z.ZodString>;
            existingRunId: z.ZodOptional<z.ZodString>;
            existingRunScope: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type RunnerError = z.infer<typeof runnerErrorSchema>;
export declare const runnerOutputSchema: z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultSha256: z.ZodOptional<z.ZodString>;
    resultBytes: z.ZodOptional<z.ZodNumber>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodEnum<{
        unknown: "unknown";
        running: "running";
        accepted: "accepted";
        "not-started": "not-started";
        "stopped-before-start": "stopped-before-start";
    }>;
    resultValidated: z.ZodOptional<z.ZodLiteral<false>>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    result: z.ZodDiscriminatedUnion<[z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"reuse-not-executed">;
        reason: z.ZodString;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        reuse: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        nativeDispatched: z.ZodLiteral<false>;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"not-executed">;
        reason: z.ZodString;
        scenarioId: z.ZodString;
        unresolvedInputs: z.ZodArray<z.ZodString>;
        executionMethod: z.ZodString;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        providerCallsStarted: z.ZodLiteral<0>;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"native-exception">;
        reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        nativeResult: z.ZodNull;
        assessmentFragment: z.ZodNull;
        effects: z.ZodLiteral<"unknown-do-not-replay">;
        partialHandoff: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        privateFailure: z.ZodString;
        workerReceipt: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        schema: z.ZodLiteral<"loki.computer-runner-operation/1">;
        status: z.ZodLiteral<"returned">;
        reuse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
        executionHost: z.ZodJSONSchema;
        nativeResult: z.ZodObject<{
            correlation: z.ZodObject<{
                requestId: z.ZodString;
                scenarioId: z.ZodString;
                planRef: z.ZodOptional<z.ZodJSONSchema>;
            }, z.core.$loose>;
            executionState: z.ZodEnum<{
                unknown: "unknown";
                completed: "completed";
                blocked: "blocked";
                cancelled: "cancelled";
                incomplete: "incomplete";
            }>;
            testVerdict: z.ZodString;
            terminal: z.ZodObject<{
                executionReportProvenance: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    responseReference: z.ZodNullable<z.ZodObject<{
                        path: z.ZodString;
                        sha256: z.ZodString;
                        bytes: z.ZodNumber;
                    }, z.core.$strict>>;
                    evidenceReferences: z.ZodArray<z.ZodObject<{
                        path: z.ZodString;
                        sha256: z.ZodString;
                        bytes: z.ZodNumber;
                        checkpointPath: z.ZodString;
                    }, z.core.$strict>>;
                    providerCall: z.ZodNumber;
                }, z.core.$strict>>>;
            }, z.core.$loose>;
            executionReport: z.ZodOptional<z.ZodNullable<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodObject<{
                effects: z.ZodOptional<z.ZodEnum<{
                    known: "known";
                    uncertain: "uncertain";
                }>>;
                basis: z.ZodLiteral<"model-authored-unverified">;
                responseId: z.ZodString;
                callId: z.ZodString;
                reason: z.ZodString;
                completedSteps: z.ZodArray<z.ZodString>;
                remainingSteps: z.ZodArray<z.ZodString>;
                evidence: z.ZodArray<z.ZodString>;
                questions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    question: z.ZodString;
                    kind: z.ZodString;
                    presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        kind: z.ZodEnum<{
                            "missing-value": "missing-value";
                            "app-choice": "app-choice";
                            permission: "permission";
                            "task-scope": "task-scope";
                        }>;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"read-only-path">;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        control: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>]>>;
                }, z.core.$strict>>;
                schema: z.ZodLiteral<"loki.runner.execution-report/1">;
                status: z.ZodEnum<{
                    complete: "complete";
                    blocked: "blocked";
                    needs_input: "needs_input";
                    stuck: "stuck";
                }>;
            }, z.core.$strict>, z.ZodObject<{
                reason: z.ZodString;
                status: z.ZodEnum<{
                    complete: "complete";
                    blocked: "blocked";
                    needs_input: "needs_input";
                    stuck: "stuck";
                }>;
                evidence: z.ZodArray<z.ZodString>;
                basis: z.ZodLiteral<"model-authored-unverified">;
                effects: z.ZodOptional<z.ZodEnum<{
                    known: "known";
                    uncertain: "uncertain";
                }>>;
                responseId: z.ZodString;
                callId: z.ZodString;
                remainingSteps: z.ZodArray<z.ZodString>;
                questions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    question: z.ZodString;
                    kind: z.ZodString;
                    presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        kind: z.ZodEnum<{
                            "missing-value": "missing-value";
                            "app-choice": "app-choice";
                            permission: "permission";
                            "task-scope": "task-scope";
                        }>;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"read-only-path">;
                        subject: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        control: z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>;
                        choices: z.ZodArray<z.ZodObject<{
                            sourceId: z.ZodString;
                            quote: z.ZodString;
                        }, z.core.$strip>>;
                    }, z.core.$strip>]>>;
                }, z.core.$strict>>;
                schema: z.ZodLiteral<"loki.runner.execution-report/2">;
            }, z.core.$strict>]>, unknown>>>;
            recovery: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                used: z.ZodBoolean;
                initialEffort: z.ZodEnum<{
                    max: "max";
                    none: "none";
                    high: "high";
                    low: "low";
                    medium: "medium";
                    xhigh: "xhigh";
                }>;
                currentEffort: z.ZodEnum<{
                    max: "max";
                    none: "none";
                    high: "high";
                    low: "low";
                    medium: "medium";
                    xhigh: "xhigh";
                }>;
                transitions: z.ZodArray<z.ZodObject<{
                    responseId: z.ZodString;
                    callId: z.ZodString;
                    from: z.ZodEnum<{
                        low: "low";
                        medium: "medium";
                    }>;
                    to: z.ZodLiteral<"medium">;
                    reason: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
            effortAccounting: z.ZodOptional<z.ZodObject<{
                low: z.ZodNumber;
                medium: z.ZodNumber;
                none: z.ZodOptional<z.ZodNumber>;
                high: z.ZodOptional<z.ZodNumber>;
                xhigh: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
        }, z.core.$loose>;
        executionConfig: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        assessmentFragment: z.ZodObject<{
            outcomes: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
            evidence: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
            target: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
            provenance: z.ZodRecord<z.ZodString, z.ZodJSONSchema>;
        }, z.core.$loose>;
        verification: z.ZodOptional<z.ZodObject<{
            planRef: z.ZodObject<{
                answerId: z.ZodString;
                resultSha256: z.ZodString;
            }, z.core.$strict>;
            repository: z.ZodString;
            sourceRevision: z.ZodString;
            pullRequestUrl: z.ZodNullable<z.ZodURL>;
            recordedAt: z.ZodISODateTime;
            provenance: z.ZodLiteral<"product-terminal-checks/1">;
            oracle: z.ZodString;
            evidence: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
                sha256: z.ZodString;
            }, z.core.$strict>>;
            tests: z.ZodArray<z.ZodObject<{
                testId: z.ZodString;
                title: z.ZodString;
                status: z.ZodEnum<{
                    skipped: "skipped";
                    blocked: "blocked";
                    fail: "fail";
                    pass: "pass";
                    "not-run": "not-run";
                }>;
                expected: z.ZodString;
                actual: z.ZodString;
                deliberateFailure: z.ZodBoolean;
                steps: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    status: z.ZodEnum<{
                        skipped: "skipped";
                        blocked: "blocked";
                        fail: "fail";
                        pass: "pass";
                        "not-run": "not-run";
                    }>;
                    expected: z.ZodString;
                    actual: z.ZodString;
                    evidenceIds: z.ZodArray<z.ZodString>;
                }, z.core.$strict>>;
                code: z.ZodNullable<z.ZodObject<{
                    path: z.ZodString;
                    revision: z.ZodString;
                    language: z.ZodString;
                    text: z.ZodString;
                    sha256: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        sourceContextId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>], "status">;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    resultRead: z.ZodObject<{
        nextOffset: z.ZodLiteral<0>;
        totalCharacters: z.ZodNumber;
        instruction: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-operation/1">;
    runId: z.ZodString;
    replayAllowed: z.ZodLiteral<false>;
    pendingClarification: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        deadlineAt: z.ZodString;
        state: z.ZodEnum<{
            unknown: "unknown";
            live: "live";
        }>;
        redaction: z.ZodOptional<z.ZodObject<{
            schema: z.ZodLiteral<"loki.runner.safe-projection/1">;
            revision: z.ZodNumber;
        }, z.core.$strict>>;
        reason: z.ZodString;
        completedSteps: z.ZodArray<z.ZodString>;
        remainingSteps: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        schema: z.ZodLiteral<"loki.runner.clarification/1">;
        clarificationId: z.ZodString;
    }, z.core.$strict>>>;
    nextAction: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"input-required">;
        tool: z.ZodLiteral<"loki_runner_answer">;
        runId: z.ZodString;
        clarificationId: z.ZodString;
        deadlineAt: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            kind: z.ZodString;
            presentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodEnum<{
                    "missing-value": "missing-value";
                    "app-choice": "app-choice";
                    permission: "permission";
                    "task-scope": "task-scope";
                }>;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"read-only-path">;
                subject: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                control: z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>;
                choices: z.ZodArray<z.ZodObject<{
                    sourceId: z.ZodString;
                    quote: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strict>>;
        instruction: z.ZodString;
    }, z.core.$strict>>;
    identity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodJSONSchema>>;
    execution: z.ZodOptional<z.ZodLiteral<"programmatic/1">>;
    createdAt: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    lastRecordedState: z.ZodOptional<z.ZodEnum<{
        running: "running";
        accepted: "accepted";
    }>>;
    stopRequested: z.ZodOptional<z.ZodBoolean>;
    receiptDirectory: z.ZodOptional<z.ZodString>;
    providerCallsStarted: z.ZodOptional<z.ZodLiteral<0>>;
    resultRecordSha256: z.ZodOptional<z.ZodString>;
    resultRecord: z.ZodOptional<z.ZodJSONSchema>;
    retainedNativeFile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        bytes: z.ZodNumber;
        sha256: z.ZodString;
        semanticAssessment: z.ZodLiteral<"not-performed">;
    }, z.core.$strict>>>;
    state: z.ZodLiteral<"finished">;
    resultValidated: z.ZodLiteral<true>;
    resultSha256: z.ZodString;
    resultBytes: z.ZodNumber;
    resultChunk: z.ZodObject<{
        encoding: z.ZodLiteral<"JSON text, UTF-16 offsets">;
        offset: z.ZodNumber;
        text: z.ZodString;
        nextOffset: z.ZodNullable<z.ZodNumber>;
        totalCharacters: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>]>, z.ZodObject<{
    schema: z.ZodLiteral<"loki.runner-error/1">;
    method: z.ZodEnum<{
        stop: "stop";
        get: "get";
        execute: "execute";
    }>;
    runId: z.ZodOptional<z.ZodString>;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            invalid_arguments: "invalid_arguments";
            request_key_conflict: "request_key_conflict";
            operation_not_found_in_scope: "operation_not_found_in_scope";
            operation_unavailable: "operation_unavailable";
            private_parameter_invalid: "private_parameter_invalid";
            private_parameter_unavailable: "private_parameter_unavailable";
            private_parameter_scope_mismatch: "private_parameter_scope_mismatch";
            private_parameter_target_mismatch: "private_parameter_target_mismatch";
            private_parameter_collision: "private_parameter_collision";
            private_parameter_revoked: "private_parameter_revoked";
        }>;
        message: z.ZodString;
        requestDispatched: z.ZodNullable<z.ZodBoolean>;
        recovery: z.ZodObject<{
            action: z.ZodString;
            instruction: z.ZodString;
            requestKey: z.ZodOptional<z.ZodString>;
            existingRunId: z.ZodOptional<z.ZodString>;
            existingRunScope: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>]>;
export type RunnerOutput = z.infer<typeof runnerOutputSchema>;
