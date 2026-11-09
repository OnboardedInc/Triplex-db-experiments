import type { TripleRow } from "@triplex-build/triplex/runtime";
import { isPatternVariable } from "@triplex-build/triplex";
import {
  type BrokerReplica,
  type BrokerReadDriver,
  type ReplicaMarker,
  type FrameMember,
  BrokerFailed,
} from "@triplex-build/triplex-broker";
import { XtdbTransactionRejected, type XtdbClient, type XtdbStatement } from "./XtdbClient.js";
import {
  assertionColumns,
  decodeAssertionRow,
  packValue,
  assertionValue,
  canonicalJson,
} from "./codecs.js";

const fixed = "TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z'";
export const XTDB_BROKER_MARKER_SQL =
  "SELECT position, epoch, incarnation FROM tx_broker_marker FOR ALL VALID_TIME WHERE _id = ?";
const decodeMarker = (rows: readonly Record<string, unknown>[]): ReplicaMarker => {
  if (rows.length === 0) return { position: 0, epoch: 0, incarnation: "" };
  if (rows.length !== 1) throw new BrokerFailed("Ambiguous XTDB broker marker");
  const row = rows[0]!;
  const position = Number(row["position"]),
    epoch = Number(row["epoch"]);
  if (
    !Number.isSafeInteger(position) ||
    position < 0 ||
    !Number.isSafeInteger(epoch) ||
    epoch < 0 ||
    typeof row["incarnation"] !== "string"
  )
    throw new BrokerFailed("Invalid XTDB broker marker");
  return { position, epoch, incarnation: row["incarnation"] };
};
const insert = (
  table: string,
  columns: readonly string[],
  values: readonly unknown[],
): XtdbStatement => ({
  sql: `INSERT INTO ${table} (_valid_from, ${columns.join(", ")}) VALUES (${fixed}, ${columns.map(() => "?").join(", ")})`,
  params: values,
});
const guard = (scope: string, from: ReplicaMarker): XtdbStatement => ({
  // [EXP-P2B] Why: ASSERT executes in the same write transaction as rows and marker (Q58b).
  // Rejected: host-side CAS probe (races a competing applier; P0004 is definitive rejection).
  sql: "ASSERT (COALESCE((SELECT position FROM tx_broker_marker FOR ALL VALID_TIME WHERE _id = ?), 0) = ? AND COALESCE((SELECT epoch FROM tx_broker_marker FOR ALL VALID_TIME WHERE _id = ?), 0) = ? AND COALESCE((SELECT incarnation FROM tx_broker_marker FOR ALL VALID_TIME WHERE _id = ?), '') = ?)",
  params: [scope, from.position, scope, from.epoch, scope, from.incarnation ?? ""],
});
const writeMarker = (scope: string, marker: ReplicaMarker) =>
  insert(
    "tx_broker_marker",
    ["_id", "scope_key", "position", "epoch", "incarnation"],
    [scope, scope, marker.position, marker.epoch, marker.incarnation ?? ""],
  );

export const isXtdbReplicaUnavailable = (cause: unknown): boolean => {
  // [EXP-P2B] Why: fall back only for structured connectivity failures; syntax and decoding stay errors.
  // Rejected: message substring matching (would turn bad SQL into a successful fallback).
  const seen = new Set<unknown>();
  let current = cause;
  let unavailable = false;
  while (current && !seen.has(current) && seen.size < 32) {
    seen.add(current);
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^(?:22|23|42|P0)/.test(code)) return false;
    if (current instanceof SyntaxError || current instanceof BrokerFailed) return false;
    if (
      [
        "ECONNREFUSED",
        "ECONNRESET",
        "EPIPE",
        "ETIMEDOUT",
        "CONNECTION_CLOSED",
        "CONNECTION_ENDED",
        "CONNECT_TIMEOUT",
      ].includes(String(code))
    )
      unavailable = true;
    current = (current as { cause?: unknown }).cause;
  }
  return unavailable && !current;
};

export interface XtdbBrokerReplica extends BrokerReplica, BrokerReadDriver {}
export const makeXtdbBrokerReplica = (client: XtdbClient, scope: string): XtdbBrokerReplica => ({
  maxFramesPerApply: 1,
  initialize: async () => {},
  isUnreachable: isXtdbReplicaUnavailable,
  marker: async () =>
    decodeMarker(
      await client.query(XTDB_BROKER_MARKER_SQL, [scope], undefined, { timeoutMs: 2000 }),
    ),
  fence: async (from, epoch, incarnation) => {
    await client.submit([
      guard(scope, from),
      writeMarker(scope, { position: from.position, epoch, incarnation }),
    ]);
  },
  publish: async (from, to, members: readonly FrameMember[]) => {
    const final = new Map<string, TripleRow>();
    for (const member of members) for (const row of member.rows) final.set(row.id, row);
    const statements: XtdbStatement[] = [guard(scope, from)];
    for (const row of final.values())
      statements.push(
        insert(
          "tx_assertions",
          ["_id", "scope_key", ...assertionColumns, "value_identity"],
          [
            JSON.stringify([scope, row.id]),
            scope,
            ...assertionColumns.map((column) => row[column]),
            canonicalJson(assertionValue(row)),
          ],
        ),
      );
    // [EXP-P2B] Why: native SQL resolves its default logical cut through tx_meta, independently of system time.
    // Rejected: stamping broker positions into XTDB system time (not a broker coordinate).
    statements.push(
      insert("tx_meta", ["_id", "scope_key", "position"], [scope, scope, to.position]),
      writeMarker(scope, to),
    );
    try {
      await client.submit(statements);
    } catch (cause) {
      // [EXP-P2B] Why: after a lost response the identical frame fails its old guard with P0004.
      // Rejected: retry forever (the broker must probe the actual marker to distinguish replay from conflict).
      if (
        !(
          cause instanceof XtdbTransactionRejected &&
          typeof cause.detail === "object" &&
          cause.detail !== null &&
          "code" in cause.detail &&
          cause.detail.code === "P0004"
        )
      )
        throw cause;
    }
    // No success counts: HostBroker must read the actual marker before advancing its publication cache.
    return {};
  },
  read: async ({ pattern, id, entities, signal }) => {
    if (!client.readSnapshot) throw new Error("XTDB broker requires readSnapshot support");
    const clauses = ["scope_key = ?"],
      params: unknown[] = [scope];
    const exact = (column: string, value: unknown) => {
      clauses.push(`${column} = ?`);
      params.push(value);
    };
    if (id !== undefined) exact("id", id);
    if (entities !== undefined) {
      if (entities.length === 0) clauses.push("FALSE");
      else {
        clauses.push(`entity_id IN (${entities.map(() => "?").join(", ")})`);
        params.push(...entities);
      }
    }
    if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId))
      exact("entity_id", pattern.entityId);
    if (pattern.attribute !== undefined && !isPatternVariable(pattern.attribute))
      exact("attribute", pattern.attribute);
    if (pattern.entityType !== undefined) exact("entity_type", pattern.entityType);
    if (pattern.value !== undefined && !isPatternVariable(pattern.value))
      for (const [column, value] of Object.entries(packValue(pattern.value)))
        if (value !== null) exact(column, value);
    const results = await client.readSnapshot(
      [
        { sql: XTDB_BROKER_MARKER_SQL, params: [scope] },
        {
          sql: `SELECT ${assertionColumns.join(", ")} FROM tx_assertions FOR ALL VALID_TIME WHERE ${clauses.join(" AND ")}`,
          params,
        },
      ],
      signal ? { signal } : {},
    );
    if (results.length !== 2) throw new BrokerFailed("Incomplete XTDB snapshot");
    return { marker: decodeMarker(results[0]!), rows: results[1]!.map(decodeAssertionRow) };
  },
});
