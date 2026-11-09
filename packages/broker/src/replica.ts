import type { FrameMember } from "./frames.js";
export interface ReplicaMarker {
  readonly position: number;
  readonly epoch: number;
  readonly incarnation?: string;
}
// [EXP-P2B] Why: the durable broker owns decisions, while each engine owns atomic publication.
// Rejected: adapting SQL to SPARQL strings (would obscure transaction and guard semantics).
export interface BrokerReplica {
  readonly maxFramesPerApply?: number;
  marker(): Promise<ReplicaMarker>;
  fence(from: ReplicaMarker, epoch: number, incarnation: string): Promise<void>;
  publish(
    from: ReplicaMarker,
    to: ReplicaMarker,
    members: readonly FrameMember[],
  ): Promise<unknown>;
  rebuild?(): Promise<unknown>;
}
