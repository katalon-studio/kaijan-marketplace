export type CaseStatus = "queued" | "running" | "passed" | "failed" | "skipped";

export type TestCase = {
  id: string;
  name: string;
  group: string;
  status: CaseStatus;
  ms: number;
  steps: string[];
  error: string;
};

export type Run = {
  id: number;
  status: "idle" | "running" | "done" | "stopped";
  startedAt: number;
  endedAt: number;
  cases: TestCase[];
};

export type RunSummary = {
  id: number;
  passed: number;
  failed: number;
  skipped: number;
  ms: number;
};

export type PaneTab = "report" | "gallery" | "controls" | "live" | "theme";

export type CaseFilter = "all" | "passed" | "failed";

export type FormValue = {
  project: string;
  env: string;
  browser: string;
  notes: string;
  submittedAt: number;
};

export type ThemeName = "off" | "aurora" | "grid" | "sunset";

declare module "claude-code" {
  interface PluginState {
    "kaijan": {
      modDemoSession: string;
      modDemoRun: Shaped<Run>;
      modDemoHistory: Shaped<RunSummary[]>;
      modDemoCollapsed: Shaped<Record<string, boolean>>;
      modDemoTab: PaneTab;
      modDemoFilter: CaseFilter;
      modDemoSelectedCase: string;
      modDemoForm: Shaped<FormValue>;
      modDemoEcho: string;
      modDemoCounter: number;
      modDemoLaps: Shaped<number[]>;
      modDemoTheme: ThemeName;
      modDemoBand: boolean;
      modDemoLastAction: string;
    };
  }
}
