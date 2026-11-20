import { AsyncLocalStorage } from "node:async_hooks";

// [DX-ERASE1] Why: a derived write brings its original erasure ticket to the same guarded native commit.
// Rejected: comparing the sequence before the HTTP write (publication could move in between).
const sequence = new AsyncLocalStorage<{
  readonly sequence: number;
  readonly replay: boolean;
  readonly sourceDatabase?: string;
}>();

export function withDatomicErasureSequence<A>(
  seq: number,
  work: () => A,
  replay = false,
  sourceDatabase?: string,
): A {
  if (!Number.isSafeInteger(seq) || seq < 0) throw new TypeError("Invalid erasure sequence");
  return sequence.run(
    { sequence: seq, replay, ...(sourceDatabase === undefined ? {} : { sourceDatabase }) },
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
