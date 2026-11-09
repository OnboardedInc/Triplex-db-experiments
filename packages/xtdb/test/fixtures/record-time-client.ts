import { recordCatalog } from "./record-catalog.js";
import {
  XtdbTransactionRejected,
  type XtdbClient,
  type XtdbStatement,
} from "../../src/XtdbClient.js";

/** SQL transport model for the actual A0 adapter. Not an XTDB planner or durability qualification. */
export const makeRecordTimeClient = (): XtdbClient => {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const table = (name: string) => {
    let value = tables.get(name);
    if (!value) {
      value = new Map();
      tables.set(name, value);
    }
    return value;
  };
  const values = (name: string, scope: unknown) =>
    [...table(name).values()].filter((row) => row["scope_key"] === scope);
  const fail = () => {
    throw new XtdbTransactionRejected(new Error("triplex-cas-conflict"));
  };
  return {
    query: async <T extends Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ) => {
      const scope = params[0];
      if (sql.includes("information_schema"))
        return (tables.has("tx_meta") ? recordCatalog() : []) as T[];
      if (sql.includes("FROM tx_meta")) return values("tx_meta", scope) as T[];
      if (sql.includes("FROM tx_attempts"))
        return values("tx_attempts", scope).filter(
          (row) => row["operation_id"] === params[1],
        ) as T[];
      if (sql.includes("FROM tx_claims"))
        return values("tx_claims", scope).filter(
          (row) => row["command_id"] === params[1] && Number(row["position"]) <= Number(params[2]),
        ) as T[];
      if (!sql.includes("FROM tx_assertions FOR ALL VALID_TIME"))
        throw new Error(`Unsupported offline SQL: ${sql}`);
      let rows = values("tx_assertions", scope),
        index = 1;
      const entityList = /entity_id IN \(([^)]+)\)/.exec(sql);
      if (entityList) {
        const count = entityList[1]!.split(",").length;
        const ids = params.slice(index, index + count);
        index += count;
        rows = rows.filter((row) => ids.includes(row["entity_id"]));
      }
      for (const column of [
        "id",
        "entity_id",
        "attribute",
        "entity_type",
        "value_type",
        "value_string",
        "value_number",
        "value_boolean",
        "value_datetime",
        "value_json",
      ])
        if (new RegExp(`\\b${column} = \\?`).test(sql)) {
          const value = params[index++];
          rows = rows.filter((row) => row[column] === value);
        }
      if (sql.includes("recorded_position <= ?")) {
        const value = Number(params[index++]);
        rows = rows.filter((row) => Number(row["recorded_position"]) <= value);
      }
      if (sql.includes("recorded_at <= ?")) {
        const value = Number(params[index++]);
        rows = rows.filter((row) => Number(row["recorded_at"]) <= value);
      }
      const position = sql.includes("retracted_position > ?") ? Number(params[index++]) : Infinity;
      const time = sql.includes("retracted_at > ?") ? Number(params[index++]) : Infinity;
      if (sql.includes("retracted_at IS NULL"))
        rows = rows.filter(
          (row) =>
            row["retracted_at"] === null ||
            Number(row["retracted_position"]) > position ||
            Number(row["retracted_at"]) > time,
        );
      if (sql.includes("valid_from <= ?")) {
        const valid = Number(params[index++]);
        index++;
        rows = rows.filter(
          (row) =>
            Number(row["valid_from"]) <= valid &&
            (row["valid_to"] === null || Number(row["valid_to"]) > valid),
        );
      }
      if (index !== params.length) throw new Error(`Unconsumed offline SQL parameters: ${sql}`);
      return rows as T[];
    },
    submit: async (statements: readonly XtdbStatement[]) => {
      // [EXP-RT01] Why: evaluate emitted guards before applying any row. Rejected: accepting adapter output unconditionally (conceals D-C1's CAS retry).
      for (const { sql, params = [], parameterSyntax } of statements) {
        if (sql.startsWith("ASSERT") && sql.includes("MAX(position)")) {
          if (Number(values("tx_meta", params[0])[0]?.["position"] ?? 0) !== params[1]) fail();
        }
        if (
          sql.startsWith("ASSERT") &&
          (sql.includes("MAX(stamp)") || sql.includes("SELECT stamp"))
        ) {
          if (
            Number(
              values("tx_meta", params[0]).find(
                (row) =>
                  !sql.includes("SELECT stamp") ||
                  (row["_id"] === params[0] && row["position"] === params[1]),
              )?.["stamp"] ?? 0,
            ) !== (parameterSyntax === "postgresql" ? params.at(-1) : params[3])
          )
            fail();
        }
      }
      for (const { sql, params = [] } of statements) {
        const match = /^INSERT INTO (\w+) \(([^)]+)\)/.exec(sql);
        if (!match) continue;
        const columns = match[2]!
          .split(",")
          .map((part) => part.trim())
          .filter((column) => column !== "_valid_from");
        for (let i = 0; i < params.length; i += columns.length) {
          const row = Object.fromEntries(
            columns.map((column, offset) => [column, params[i + offset]]),
          );
          table(match[1]!).set(String(row["_id"]), row);
        }
      }
      return {};
    },
    close: async () => {},
  };
};
