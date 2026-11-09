import type { TriplesHandle } from "./triplex.ts";
// [DX-H2] Why: Triples.transactions loads all _Transaction rows before paging (64 MiB at N=200).
// Rejected: increasing the transport cap or folding ACK payloads (not an independent stored-journal check).
// This private-scope enumeration records identities only; every returned record is point-read from storage.
export function w0Journal(handle: Pick<TriplesHandle, "triples" | "run">) {
  const ids = new Map<number, string>();
  let highest = 0;
  return {
    record: (receipt: { position: number; txId: string }) => {
      const { position, txId } = receipt;
      if (
        !Number.isSafeInteger(position) ||
        position < 1 ||
        !txId ||
        (ids.has(position) && ids.get(position) !== txId)
      )
        throw Error("W0 journal ACK identity mismatch");
      ids.set(position, txId);
      highest = Math.max(highest, position);
    },
    page: async (after: number, limit: number) => {
      if (
        !Number.isSafeInteger(after) ||
        after < 0 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 1000
      )
        throw Error("invalid W0 journal page");
      const head = Number(await handle.run(handle.triples.currentPosition()));
      if (!Number.isSafeInteger(head) || head !== ids.size || highest !== head)
        throw Error("W0 journal has an unobserved commit or position gap");
      const positions = Array.from(
        { length: Math.max(0, Math.min(limit, head - after)) },
        (_, i) => after + i + 1,
      );
      const transactions: any[] = [];
      for (let offset = 0; offset < positions.length; offset += 8) {
        const records = await Promise.all(
          positions.slice(offset, offset + 8).map(async (position) => {
            const tx: any = await handle.run(handle.triples.transaction(ids.get(position)!));
            if (
              !tx ||
              tx.position !== position ||
              tx.txId !== ids.get(position) ||
              !Array.isArray(tx.changes)
            )
              throw Error("W0 stored journal identity/content missing");
            return tx;
          }),
        );
        transactions.push(...records);
      }
      return {
        transactions,
        ...(transactions.length ? { next: transactions.at(-1).position } : {}),
      };
    },
  };
}
