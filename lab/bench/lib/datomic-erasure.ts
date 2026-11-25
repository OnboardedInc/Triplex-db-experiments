import { DatomicClient, withDatomicErasureSequence } from "../../../packages/datomic/dist/index.js";
import { runtimeApi } from "./triplex.ts";
import type { CompositionHandle } from "./composition.ts";

export class ErasureChanged extends Error {
  override readonly name = "ErasureFrontierChanged";
}
export type ErasureSource = Pick<CompositionHandle, "backend" | "scopeName">;

// [DX-ERASE1] Why: derived work must verify the current authority independently of its old data pin.
// Rejected: treating the position or the presence of a native handle as an erasure ticket.
// [DX-ERA2] `account` (optional): on a database guarded per account the answer also carries that account's removal
// sequence (accountSeq) and the sequence of entities outside every account (unscopedSeq). Without it, as before.
export async function readErasure(source: Partial<ErasureSource>, account?: string) {
  if (source.backend?.name !== "datomic" || source.backend.url.startsWith("memory://")) return;
  if (!source.scopeName) throw new ErasureChanged("Datomic scope identity is absent");
  const scope = String(runtimeApi.DatabaseScope.test(source.scopeName));
  const client = new DatomicClient(source.backend.url);
  try {
    const db = "s2-" + Buffer.from(scope).toString("base64url");
    const cut = account === undefined
      ? await client.erasureFrontier(db)
      : await client.request<Awaited<ReturnType<DatomicClient["erasureFrontier"]>> & {
          perAccount?: boolean; accountSeq?: number; unscopedSeq?: number;
        }>("GET", `/v2/db/${db}/erasure-frontier?account=${encodeURIComponent(account)}`);
    if (cut.protected) return cut;
  } finally {
    client.close();
  }
}
// [DX-ERA2] With `account` on a database guarded per account, an input read at removal sequence `sequence` is still
// current when no removal published after it touched that account or an entity outside every account. Otherwise (no
// account, or a database-wide database) the sequence must be unchanged, as before.
export async function recheckErasure(source: Partial<ErasureSource>, sequence: number | undefined, account?: string) {
  const current = await readErasure(source, account) as
    | (Awaited<ReturnType<typeof readErasure>> & { perAccount?: boolean; accountSeq?: number; unscopedSeq?: number })
    | undefined;
  const narrow = account !== undefined && current?.perAccount === true && sequence !== undefined &&
    Number.isSafeInteger(current.accountSeq) && Number.isSafeInteger(current.unscopedSeq);
  if (narrow
    ? !(sequence! <= current!.seq && current!.accountSeq! <= sequence! && current!.unscopedSeq! <= sequence!)
    : current?.seq !== sequence)
    throw new ErasureChanged("Discard the old protected input cut");
  return current;
}
// [DX-ERA2] `accounts` (optional): the accounts this derived write read; a database guarded per account then refuses
// it only for a removal in one of them. Without it the ticket is the database-wide one, as before.
export function withErasure<A>(
  sequence: number | undefined,
  work: () => A,
  sourceDatabase?: string,
  accounts?: readonly string[],
) {
  return sequence === undefined
    ? work()
    : withDatomicErasureSequence(sequence, work, false, sourceDatabase, accounts);
}

export function verifySameErasureAuthority(
  source: Partial<ErasureSource>,
  recipient: Partial<ErasureSource>,
) {
  if (recipient.backend?.name !== "datomic" || source.backend?.url !== recipient.backend.url)
    throw new ErasureChanged("Recipient cannot verify the source in its commit");
}
