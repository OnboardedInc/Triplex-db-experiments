import { AsyncLocalStorage } from "node:async_hooks";

// [DX-ERASE1] Why: a derived write brings its original erasure ticket to the same guarded native commit.
// Rejected: comparing the sequence before the HTTP write (publication could move in between).
const sequence = new AsyncLocalStorage<{
  readonly sequence: number;
  readonly replay: boolean;
  readonly sourceDatabase?: string;
  readonly accounts?: readonly string[];
}>();

// [DX-ERA2] Why: a derived write may name the accounts its protected inputs were read from; a database guarded per
// account then refuses it only for a removal in one of those accounts. Without `accounts` the ticket and its wire
// bytes are exactly as before (the database-wide check). Rejected: inferring the source accounts from the written
// entities (settlement documents live outside the account's prefix).
export function withDatomicErasureSequence<A>(
  seq: number,
  work: () => A,
  replay = false,
  sourceDatabase?: string,
  accounts?: readonly string[],
): A {
  if (!Number.isSafeInteger(seq) || seq < 0) throw new TypeError("Invalid erasure sequence");
  if (
    accounts !== undefined &&
    (!Array.isArray(accounts) ||
      accounts.length < 1 ||
      accounts.length > 64 ||
      !accounts.every((a) => typeof a === "string" && /^[^/\s]{1,128}$/.test(a)) ||
      new Set(accounts).size !== accounts.length)
  )
    throw new TypeError("Invalid erasure ticket accounts");
  return sequence.run(
    {
      sequence: seq,
      replay,
      ...(sourceDatabase === undefined ? {} : { sourceDatabase }),
      ...(accounts === undefined ? {} : { accounts: [...accounts] }),
    },
    work,
  );
}
export const erasureWriteTicket = () => sequence.getStore();

interface Identity {
  readonly assertionId: string;
  readonly entity: string;
  readonly attribute: string;
  readonly valueType: string;
  readonly validFrom: number;
  readonly validTo: number | null;
}

export type ErasureSelector =
  | { readonly id: string }
  | { readonly entityId: string; readonly attribute?: string };

export interface ErasureReceipt {
  readonly t: string;
  readonly seq: number;
  readonly erasedAt: number;
  readonly position: number;
  readonly txId: string;
  readonly identities: readonly Identity[];
}

export interface ErasureFrontier {
  readonly database: string;
  readonly protected: boolean;
  readonly seq: number;
  readonly erased: Readonly<Record<string, import("@triplex-build/triplex").ErasedValue>>;
}
