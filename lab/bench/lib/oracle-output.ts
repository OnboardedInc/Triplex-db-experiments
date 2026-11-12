import { createHash } from "node:crypto";
// [DX-R3-P8] Why: successful comparison needs this attempt's complete oracle query set and exact input preimage.
// Rejected: exit zero or an old expected file certifying missing, duplicated or differently bound queries.
export function requireOracleBinding(out: any, input: string, caseDoc: any) {
  if (
    out.format !== "triplex-db-2/o-replay-expected/1" ||
    out.caseId !== caseDoc.caseId ||
    out.caseSha256 !== createHash("sha256").update(input).digest("hex") ||
    !Array.isArray(out.queries)
  )
    throw Error("O-REPLAY output is not bound to this exact case");
  const wanted = new Map(caseDoc.queries.map((q: any) => [q.id, q.kind]));
  if (wanted.size !== caseDoc.queries.length || out.queries.length !== wanted.size)
    throw Error("O-REPLAY query coverage differs");
  for (const query of out.queries) {
    if (
      !wanted.has(query.id) ||
      wanted.get(query.id) !== query.kind ||
      !Array.isArray(query.result?.raw)
    )
      throw Error("O-REPLAY query identity, kind or rows differ");
    wanted.delete(query.id);
  }
  if (wanted.size) throw Error("O-REPLAY query coverage incomplete");
}
