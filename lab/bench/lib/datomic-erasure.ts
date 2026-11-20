import { DatomicClient, withDatomicErasureSequence } from "../../../packages/datomic/dist/index.js";
import { runtimeApi } from "./triplex.ts";
import type { CompositionHandle } from "./composition.ts";

export class ErasureChanged extends Error {
  override readonly name = "ErasureFrontierChanged";
}
export type ErasureSource = Pick<CompositionHandle, "backend" | "scopeName">;

// [DX-ERASE1] Why: derived work must verify the current authority independently of its old data pin.
// Rejected: treating the position or the presence of a native handle as an erasure ticket.
export async function readErasure(source: Partial<ErasureSource>) {
  if (source.backend?.name !== "datomic" || source.backend.url.startsWith("memory://")) return;
  if (!source.scopeName) throw new ErasureChanged("Datomic scope identity is absent");
  const scope = String(runtimeApi.DatabaseScope.test(source.scopeName));
  const client = new DatomicClient(source.backend.url);
  try {
    const cut = await client.erasureFrontier("s2-" + Buffer.from(scope).toString("base64url"));
    if (cut.protected) return cut;
  } finally {
    client.close();
  }
}
export async function recheckErasure(source: Partial<ErasureSource>, sequence: number | undefined) {
  const current = await readErasure(source);
  if (current?.seq !== sequence) throw new ErasureChanged("Discard the old protected input cut");
}
export function withErasure<A>(
  sequence: number | undefined,
  work: () => A,
  sourceDatabase?: string,
) {
  return sequence === undefined
    ? work()
    : withDatomicErasureSequence(sequence, work, false, sourceDatabase);
}

export function verifySameErasureAuthority(
  source: Partial<ErasureSource>,
  recipient: Partial<ErasureSource>,
) {
  if (recipient.backend?.name !== "datomic" || source.backend?.url !== recipient.backend.url)
    throw new ErasureChanged("Recipient cannot verify the source in its commit");
}
