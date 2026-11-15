import type { EngineInterface, Register } from "claude-code";

export interface QaDemoState {
  sessions: Map<
    string,
    { profile?: string; read?: Promise<string | undefined> }
  >;
}

export function createQaDemoState(): QaDemoState;
export function qaDemoEnabled(
  $: EngineInterface,
  state: QaDemoState,
): Promise<boolean>;
export function registerQaDemos(
  on: Parameters<Register>[0],
  state: QaDemoState,
): void;
