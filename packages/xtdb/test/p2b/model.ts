import type { TripleRow } from "@triplex-build/triplex/runtime";
import {
  XtdbTransactionRejected,
  type XtdbClient,
  type XtdbStatement,
} from "../../src/XtdbClient.js";

// [EXP-P2B] Why: a deliberately narrow SQL model checks generated guards/parameters without an engine.
// Rejected: returning oracle answers from the SQL client (would bypass driver selection bugs).
export class ModelXtdbClient implements XtdbClient {
  rows = new Map<string, TripleRow>();
  marker: Record<string, unknown> | undefined;
  transactions: (readonly XtdbStatement[])[] = [];
  snapshots: (readonly XtdbStatement[])[] = [];
  unavailable = false;
  lostResponse = false;
  private check() {
    if (this.unavailable)
      throw Object.assign(new Error("offline unavailable"), { code: "ECONNREFUSED" });
  }
  query: XtdbClient["query"] = async <T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ) => {
    this.check();
    if (sql.startsWith("SELECT position, epoch, incarnation FROM tx_broker_marker"))
      return (this.marker ? [this.marker] : []) as T[];
    if (sql.includes("FROM tx_assertions FOR ALL VALID_TIME WHERE ")) {
      const clauses = sql.split(" WHERE ")[1]!.split(" AND ");
      let at = 0;
      const predicates: ((row: TripleRow) => boolean)[] = [];
      for (const clause of clauses) {
        if (clause === "scope_key = ?") {
          at++;
          continue;
        }
        if (clause === "FALSE") {
          predicates.push(() => false);
          continue;
        }
        const one = /^(\w+) = \?$/.exec(clause);
        if (one) {
          const value = params[at++],
            column = one[1] as keyof TripleRow;
          predicates.push((row) => row[column] === value);
          continue;
        }
        const many = /^entity_id IN \((.+)\)$/.exec(clause);
        if (many) {
          const count = many[1]!.split(", ").length,
            values = params.slice(at, at + count);
          at += count;
          predicates.push((row) => values.includes(row.entity_id));
          continue;
        }
        throw new Error(`Unsupported model clause: ${clause}`);
      }
      if (at !== params.length) throw new Error("Unused query parameter");
      return structuredClone(
        [...this.rows.values()].filter((row) => predicates.every((predicate) => predicate(row))),
      ) as unknown as T[];
    }
    throw new Error(`Unsupported model SQL: ${sql}`);
  };
  submit = async (statements: readonly XtdbStatement[]) => {
    this.check();
    this.transactions.push(structuredClone(statements));
    const guard = statements[0]!;
    if (!guard.sql.startsWith("ASSERT (COALESCE((SELECT position"))
      throw new Error("Missing in-transaction guard");
    const p = guard.params!;
    if (
      (this.marker?.["position"] ?? 0) !== p[1] ||
      (this.marker?.["epoch"] ?? 0) !== p[3] ||
      (this.marker?.["incarnation"] ?? "") !== p[5]
    )
      throw new XtdbTransactionRejected(
        Object.assign(new Error("Guard failed"), { code: "P0004" }),
      );
    const rows = new Map(this.rows);
    let marker = this.marker;
    for (const statement of statements.slice(1)) {
      if (!statement.sql.includes("TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z'"))
        throw new Error("No fixed physical valid time");
      const columns = /INSERT INTO (\w+) \(_valid_from, (.+)\) VALUES/.exec(statement.sql);
      if (!columns) throw new Error("Unsupported INSERT");
      const record = Object.fromEntries(
        columns[2]!.split(", ").map((column, i) => [column, statement.params![i]]),
      );
      if (columns[1] === "tx_broker_marker") marker = record;
      else if (columns[1] === "tx_assertions")
        rows.set(String(record["id"]), record as unknown as TripleRow);
      else if (columns[1] !== "tx_meta") throw new Error("Unexpected table");
    }
    this.rows = rows;
    this.marker = marker;
    if (this.lostResponse) {
      this.lostResponse = false;
      throw Object.assign(new Error("Response lost after apply"), { code: "ECONNRESET" });
    }
    return {};
  };
  readSnapshot = async (statements: readonly XtdbStatement[]) => {
    this.check();
    this.snapshots.push(structuredClone(statements));
    return Promise.all(statements.map((statement) => this.query(statement.sql, statement.params)));
  };
  close = async () => {};
}
