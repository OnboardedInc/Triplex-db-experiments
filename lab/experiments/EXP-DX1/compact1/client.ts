export type Instant = string;
export type ProtectedScalar = readonly ["pii-v1", string];
export type Scalar = string | number | boolean;
export type FactId = readonly [position: number, ordinal: number];
export type Assertion = readonly [
  entity: string,
  attribute: string,
  value: Scalar | ProtectedScalar,
  from: Instant | null,
  to: Instant | null,
];

export interface Save {
  account: string;
  root: string;
  command: string;
  expected: number;
  adds: readonly Assertion[];
  retires: readonly FactId[];
}
export interface Receipt {
  account: string;
  epoch: number;
  subject: string;
  command: string;
  position: number;
  recorded: number;
  nativeT: number;
  fingerprint: string;
}
export type Outcome = Receipt | { error: string };
export interface World {
  subject: string;
  facts: { e: string; a: string; v: Scalar | { erasedAt: Instant }; tx: number }[];
}
export interface Entry extends Receipt {
  changes: {
    op: "assert" | "retire";
    id: FactId;
    e: string;
    a: string;
    v: World["facts"][number]["v"];
    from: Instant | null;
    to: Instant | null;
    recordedAt: number;
    retiredAt?: number;
  }[];
}
export type CompactTransport = <T>(method: string, args: readonly unknown[]) => Promise<T>;

// [DX-COMPACT1] Why: exercise the same exact command and basis shapes through a TypeScript caller.
// Rejected: passing a mutable native connection or ambient position between the caller and gateway.
export class CompactClient {
  constructor(privateTransport: CompactTransport) {
    this.request = privateTransport;
  }

  private readonly request: CompactTransport;

  save(request: Save) {
    return this.request<Outcome>("save", [request]);
  }

  saveGroup(requests: readonly Save[]) {
    return this.request<Outcome[]>("save-group", [requests]);
  }

  receipt(account: string, command: string) {
    return this.request<Receipt | null>("receipt", [account, command]);
  }

  current(account: string, root: string, validAt: Instant) {
    return this.request<World>("current", [account, root, validAt]);
  }

  pinned(account: string, root: string, position: number, validAt: Instant) {
    return this.request<World>("pinned", [account, root, position, validAt]);
  }

  feed(account: string, after: number, limit: number) {
    return this.request<Entry[]>("feed", [account, after, limit]);
  }
}
