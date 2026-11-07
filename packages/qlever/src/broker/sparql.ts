/**
 * The guarded publication update for a batch of durable frames (EXP-P2Q brief point 2; C2.3, R13 6.7).
 *
 *   DELETE { old terms ; marker = M } INSERT { new terms ; claims ; receipts ; marker = M' } WHERE { marker = M }
 *
 * Every term is a constant from the broker's own record (frames.ts), so the update reads nothing but the
 * marker: R17 2.2 measured an engine-side read of old values at 5 to 7 ms extra per command. The guard turns
 * a duplicate or replayed update into a detectable no-op (R17 2.1 item 1: re-sending after publication
 * returned 200 with 0 deleted and 0 inserted and left the marker unchanged). The marker carries the epoch,
 * so an update from a broker whose epoch has been superseded matches nothing (R13 5.1, C3.3).
 *
 * Net delta per row across the batch: delete `fields(base) - fields(final)` and insert
 * `fields(final) - fields(base)`, where `base` is the version the replica holds before the batch (the
 * first prior any member of the batch recorded for that row, or nothing for a new row). A retraction
 * therefore deletes only the old `_row` literal and inserts the retraction fields.
 */
import type { TripleRow } from "@triplex-build/triplex/runtime";
import {
  assertionIri,
  claimIri,
  fieldIri as f,
  graphIri,
  literal as lit,
  metaIri,
  operationIri,
  rowFields,
} from "../rdf.js";
import type { FrameMember } from "./frames.js";

export interface ReplicaMarker {
  /** Packed position of the last applied ordinal slot (lastPositionOf(lsn)), 0 when nothing applied. */
  readonly position: number;
  readonly epoch: number;
}

export const markerFields = {
  position: f("broker_position"),
  epoch: f("broker_epoch"),
} as const;

const quad = (s: string, p: string, o: string) => `${s} ${p} ${o} .`;

export interface BuiltUpdate {
  readonly sparql: string;
  readonly inserts: number;
  readonly deletes: number;
  readonly members: number;
}

export const buildPublication = (
  scopeKey: string,
  from: ReplicaMarker,
  to: ReplicaMarker,
  members: readonly FrameMember[],
): BuiltUpdate => {
  const graph = graphIri(scopeKey);
  const base = new Map<string, TripleRow | null>();
  const final = new Map<string, TripleRow>();
  for (const member of members) {
    const priors = new Map(member.priors.map((row) => [row.id, row]));
    for (const row of member.rows) {
      if (!base.has(row.id)) base.set(row.id, priors.get(row.id) ?? null);
      final.set(row.id, row);
    }
  }
  const deletes: string[] = [];
  const inserts: string[] = [];
  for (const [id, row] of final) {
    const subject = assertionIri(id);
    const before = base.get(id);
    const oldTerms = new Set(before ? rowFields(before).map(([p, o]) => `${f(p)} ${o}`) : []);
    const newTerms = new Set(rowFields(row).map(([p, o]) => `${f(p)} ${o}`));
    for (const term of oldTerms) if (!newTerms.has(term)) deletes.push(`${subject} ${term} .`);
    for (const term of newTerms) if (!oldTerms.has(term)) inserts.push(`${subject} ${term} .`);
  }
  for (const member of members) {
    const position = String(member.positions[member.positions.length - 1] ?? to.position);
    for (const claim of member.claims)
      for (const [column, value] of [
        ["command_id", claim.commandId],
        ["tx_id", claim.txId],
        ["recorded_at", String(claim.timestamp)],
        ["position", position],
      ] as const)
        inserts.push(quad(claimIri(claim.commandId), f(column), lit(value)));
    for (const [column, value] of [
      ["operation_id", member.operationId],
      ["attempt_id", member.attemptId],
      ["position", position],
    ] as const)
      inserts.push(quad(operationIri(member.operationId), f(column), lit(value)));
  }
  // The A0 `position` triple is kept equal to the replica marker so the query executor's default basis
  // (latest publication) keeps working on a broker-fed graph.
  const markerTerms = (marker: ReplicaMarker) => [
    quad(metaIri, markerFields.position, lit(String(marker.position))),
    quad(metaIri, markerFields.epoch, lit(String(marker.epoch))),
    quad(metaIri, f("position"), lit(String(marker.position))),
    quad(metaIri, f("position_native"), String(marker.position)),
  ];
  const sparql =
    `DELETE { GRAPH ${graph} { ${[...deletes, ...markerTerms(from)].join("\n")} } } ` +
    `INSERT { GRAPH ${graph} { ${[...inserts, ...markerTerms(to)].join("\n")} } } ` +
    `WHERE { ${guard(graph, from)} }`;
  return { sparql, inserts: inserts.length + 4, deletes: deletes.length, members: members.length };
};

/** Marker guard; an absent marker reads as (0, 0) so a fresh graph accepts the first update. */
const guard = (graph: string, from: ReplicaMarker) =>
  `OPTIONAL { GRAPH ${graph} { ${metaIri} ${markerFields.position} ?brokerPosition } } ` +
  `OPTIONAL { GRAPH ${graph} { ${metaIri} ${markerFields.epoch} ?brokerEpoch } } ` +
  `FILTER(COALESCE(?brokerPosition, "0") = ${lit(String(from.position))} && COALESCE(?brokerEpoch, "0") = ${lit(String(from.epoch))})`;

/** Fencing update at broker startup: keep the position, take the epoch (R13 6.5 step 6, C3.3). */
export const buildFence = (scopeKey: string, from: ReplicaMarker, epoch: number): string => {
  const graph = graphIri(scopeKey);
  return (
    `DELETE { GRAPH ${graph} { ${quad(metaIri, markerFields.epoch, lit(String(from.epoch)))} } } ` +
    `INSERT { GRAPH ${graph} { ${quad(metaIri, markerFields.epoch, lit(String(epoch)))} } } ` +
    `WHERE { ${guard(graph, from)} }`
  );
};

export const markerQuery = (scopeKey: string): string => {
  const graph = graphIri(scopeKey);
  return `SELECT ?brokerPosition ?brokerEpoch WHERE { OPTIONAL { GRAPH ${graph} { ${metaIri} ${markerFields.position} ?brokerPosition } } OPTIONAL { GRAPH ${graph} { ${metaIri} ${markerFields.epoch} ?brokerEpoch } } }`;
};
