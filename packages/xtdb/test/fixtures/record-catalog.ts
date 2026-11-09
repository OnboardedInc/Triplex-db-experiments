// [EXP-RT01] Why: mocks must model the typed schema probe separately from metadata values. Rejected: returning generic rows for catalog SQL (would conceal the fresh-store failure).
export const recordCatalog = (stamp = true) =>
  ["scope_key", "position", ...(stamp ? ["stamp"] : [])].map((column_name) => ({
    table_name: "tx_meta",
    column_name,
    xt_type: column_name === "scope_key" ? "utf8" : "i64",
  }));
