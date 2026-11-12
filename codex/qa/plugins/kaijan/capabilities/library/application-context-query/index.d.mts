/**
 * NEW Engineering representation, authored for loki#2022 by Issue Agent
 * codex:01a1999d-cd83-7d43-812c-625753508ff7, 2026-11-02.
 * Sources and field dispositions: contract-ledger.md. Historical bytes and
 * structural equivalence are unknown. No Runner wire compatibility is asserted.
 */
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export const contract: "engineering.bound-documents/1-draft1";
export const bundleContract: "engineering.bound-document-bundle/1-draft1";
export const representation: "engineering-bound-documents-contract/1-draft1";
export interface Observation {
  producer: string;
  basis: "observed";
  /** Unchanged native fields/references; no dereference or completeness claim. */
  content: { [key: string]: Json };
}
export interface ContextRequest {
  schema: typeof contract;
  requestId: string;
  queryId: string;
  runId: string;
  scenarioId: string | null;
  kind: "documentation" | "risk" | "map";
  question: string;
  observations: { screen: Observation | null; path: Observation | null };
  sourceBindingIds: string[];
  retrieval: { sourceIds: string[] | null; cursor: string | null };
}
export interface HostControls {
  /** Absolute RFC3339 UTC, Z suffix, at most milliseconds. Frozen per query. */
  deadlineAt: string;
  /** Positive integer bytes of the entire JSON.stringify(result) UTF-8 value. */
  outputBytes: number;
}
export interface HostBinding {
  bindingId: string;
  callerId: string;
  runId: string;
  /** Host-selected absolute regular-file path. Never accepted in model input. */
  path: string;
  sha256: string;
}
export interface BoundDocument {
  sourceId: string;
  text: string;
  /** Supplied metadata is optional; exact text and its source ID are retained. */
  uri?: string | null;
  revision?: string | null;
  capturedAt?: string | null;
  attribution?: string;
  provenance?: { [key: string]: Json };
  /** Optional historical/raw artifact identity; null means unknown. */
  rawArtifactSha256?: string | null;
}
export interface UnavailableDocument {
  sourceId: string;
  unavailableReason: string;
}
export interface DocumentBundle {
  schema: typeof bundleContract;
  documents: (BoundDocument | UnavailableDocument)[];
}
export interface InventoryEntry {
  bindingId: string | null;
  sourceId: string | null;
  bundleSha256?: string;
  recordSha256?: string;
  textSha256?: string | null;
  uri?: string | null;
  revision?: string | null;
  capturedAt?: string | null;
  attribution?: string;
  provenance?: { [key: string]: Json };
  rawArtifactSha256?: string | null;
  unavailableReason?: string;
}
export interface Citation {
  unit: "UTF-16";
  /** Zero-based half-open range in original document text, scalar boundaries. */
  start: number;
  end: number;
  textSha256: string;
  recordSha256: string;
  bundleSha256: string;
  rawArtifactSha256: string | null;
  quoteSha256: string;
}
export interface DocumentationChunk {
  sourceId: string;
  bindingId: string;
  text: string;
  citation: Citation;
}
export interface Accounting {
  purpose: "bound-document-retrieval";
  sourceReadAttempts: number;
  sourceReads: number;
  /** Successfully hash-verified raw bundle bytes. Failed/partial bytes unknown. */
  sourceBytes: number;
  providerAttempts: 0;
  providerCalls: 0;
  networkCalls: 0;
  browserCalls: 0;
  providerCost: { amount: 0; currency: "USD"; basis: "no provider dispatch" };
  hostCost: null;
  elapsedMs: number;
}
export interface ContextResult {
  schema: typeof contract;
  implementationSha256: string;
  requestId: string;
  queryId: string;
  runId: string;
  mode: "bound-documents/1";
  semanticRelevance: "unassessed";
  status:
    "complete" | "partial" | "empty" | "unavailable" | "cancelled" | "failed";
  reasons: string[];
  inventory: InventoryEntry[];
  documentation: DocumentationChunk[];
  mapAssertions: [];
  uncertainties: [];
  coverage: {
    sources: number;
    unavailable: number;
    sourceIndex: number;
    textOffsetUtf16: number;
  };
  nextCursor: string | null;
  accounting: Accounting;
}
export interface Capabilities {
  contract: typeof contract;
  representation: typeof representation;
  mode: "bound-documents/1";
  documentation: true;
  risk: false;
  map: false;
  semanticRelevance: "unassessed";
  providerCalls: 0;
  networkCalls: 0;
  browserCalls: 0;
  bindings: string[];
}
export class ContextQueryError extends Error {
  code: string;
  details: { [key: string]: Json };
  /** Host recovery only when final publication fails after computation. */
  originalResult?: ContextResult;
  constructor(code: string, details?: { [key: string]: Json });
}
export interface ApplicationContextService {
  contract: typeof contract;
  capabilities: Capabilities;
  /** Exact request re-read returns original accounting; do not charge it again. */
  query(
    request: ContextRequest,
    controls: HostControls,
    options?: { signal?: AbortSignal },
  ): Promise<ContextResult>;
}
export function createApplicationContextService(options: {
  directory: string;
  callerId: string;
  runId: string;
  bindings: HostBinding[];
}): Promise<ApplicationContextService>;
