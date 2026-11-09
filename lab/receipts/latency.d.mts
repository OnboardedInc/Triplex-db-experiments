export type QleverConnectionMode = "keep-alive" | "per-request";
export interface QleverLatencyReceipt {
  readonly qleverConnectionMode: QleverConnectionMode;
}
export interface LatencyReceipt {
  readonly qleverConnectionMode: QleverConnectionMode | null;
}
export declare function requireQleverConnectionMode(mode: unknown): QleverConnectionMode;
export declare function qleverLatencyReceipt<T extends QleverLatencyReceipt>(receipt: T): T;
export declare function latencyReceipt<T extends LatencyReceipt>(receipt: T): T;

export declare function connectionModeForBackend(backend: string): QleverConnectionMode | null;
export declare function recordedConnectionMode(receipt: {
  lane?: string;
  backend?: string;
  queryPath?: string;
  qleverConnectionMode?: unknown;
}): QleverConnectionMode | null;
