import { Buffer } from "node:buffer";

// [EXP-DA01] Why: adapter and executor must address the same reversible name as the gateway. Rejected: retaining the DA00 hash at either call site (live source-cut reads address a different database).
export const databaseName = (scopeKey: string): string =>
  `s2-${Buffer.from(scopeKey, "utf8").toString("base64url")}`;
