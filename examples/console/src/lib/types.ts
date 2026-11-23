// [DX-CON1] Answer shapes of the tools, as builder A's contract states them (demo/toy/README-FOR-CONSOLE.md). Only the
// fields the screens read are typed; everything else is shown as the tool returned it.

export type Fact = {
  entity: string;
  attribute: string;
  value: unknown;
  type: string;
  validFrom: string | null;
  validTo: string | null;
  recordedAt: string | null;
  id: string;
  recordedPosition?: number;
  position?: number;
  entityType?: string | null;
  txId?: string;
};
export type ReadSubject = {
  account: string;
  subject: number;
  subjectId: string;
  entities: number;
  factCount: number;
  facts: Fact[];
};
export type ReadEntity = {
  entity: string;
  entityType: string;
  kindFromId?: string;
  note?: string;
  number?: number;
  factCount?: number;
  facts: Fact[];
  subject?: { root: string; entities: number; factCount: number; facts: Fact[] };
  account?: string;
};
export type Summary = {
  kind: string;
  accounts: number;
  subjects: number;
  recordsAtBringUp: number;
  recordsAtSeal: number;
  sealedHead: number;
  headAtBringUp: number;
  head: number;
  transactionsSinceSeal: number;
  recordTimeRange: { first: string | null; lastAtBringUp: string | null; note?: string };
  compatibility?: string | null;
  workingCopy?: boolean;
  workingCopyMadeAt?: string;
  serverReadyAt?: string;
  memory?: Record<string, unknown>;
  note?: string;
  live?: unknown;
  entityTypes?: number;
};
export type SubjectRow = {
  subject: number;
  subjectId: string;
  status: string | null;
  placements: number;
  lastRecordedAt: string | null;
};
export type FindSubjects = { account: string; subjects: SubjectRow[]; lookup: string };
export type Change = {
  op: "assert" | "retract";
  entity: string;
  attribute: string;
  value: unknown;
  validFrom: string | null;
  validTo: string | null;
};
export type Transaction = {
  position: number;
  txId: string;
  recordedAt: string | null;
  commandId: string | null;
  actor: string | null;
  changes: Change[];
  totalChanges: number;
  configSnapshot?: string | null;
  release?: { id: string; label?: string } | null;
};
export type Feed = {
  after: number;
  account: string | null;
  transactions: Transaction[];
  next: number | null;
  compatibility?: string;
  nextBefore?: number | null;
};
export type FeedSummary = {
  after: number;
  transactionsRead: number;
  pages: number;
  complete: boolean;
  subjectsChanged: number;
  subjects: {
    subject: string;
    account: string | null;
    root: string | null;
    transactions: number;
    factsChanged: number;
    lastPosition: number;
  }[];
};
export type HistoryRow = {
  value: unknown;
  validFrom: string | null;
  validTo: string | null;
  recordedAt: string | null;
  recordedPosition: number;
  retiredAt: string | null;
  retiredPosition: number | null;
  live: boolean;
  id: string;
};
export type FieldHistory = {
  entity: string;
  attribute: string;
  totalRows: number;
  entityHistoryRows: number;
  rowsShown: string;
  rows: HistoryRow[];
  savesOfThisField?: number;
};
export type AtView = {
  entity: string;
  attribute: string;
  value: unknown;
  validFrom: string | null;
  validTo: string | null;
  recordedAt: string | null;
};
export type ReadAt = {
  at: string;
  believedAsRecordedAt: string | null;
  believedAtPosition?: number;
  counts: { current: number; trueThenAsKnownNow: number; believedThen: number };
  differences: {
    fact: string;
    current: unknown[] | null;
    trueThenAsKnownNow: unknown[] | null;
    believedThen: unknown[] | null;
  }[];
  current?: AtView[];
  trueThenAsKnownNow?: AtView[];
  believedThen?: AtView[];
};
export type Receipt = {
  commandId: string;
  txId: string;
  position: number;
  recordedAt: string | null;
};

export type AttributeDef = {
  key: string;
  valueType: string;
  required?: boolean;
  cardinality?: "one" | "many";
  unique?: boolean;
  refTarget?: string;
  enumValues?: string[];
};
export type ReleaseRef = { id: string; label: string; sequence: number; parent?: string | null };
export type TypeSummary = {
  name: string;
  attributes: number;
  created?: number | null;
  createdByAccount?: Record<string, number> | null;
  note?: string;
};
export type ListTypes = {
  ref: string;
  release: ReleaseRef | null;
  refs: { test: ReleaseRef | null; live: ReleaseRef | null };
  types: TypeSummary[];
  note?: string;
  configurationReads?: number;
};
export type DescribeType = {
  ref?: string;
  note?: string;
  uniqueness?: string;
  type: {
    name: string;
    attributes: AttributeDef[];
    constraints: { id: string; kind: string; attribute?: string; status: string }[];
    revisions: { sequence: number; revision: string; release: string; change: string }[];
  };
  release?: ReleaseRef;
};
export type Release = {
  id: string;
  label: string;
  sequence: number;
  parent: string | null;
  objects: number;
  types?: string[];
  refs: string[];
  position?: number;
};
export type ListReleases = {
  refs: { test: ReleaseRef | null; live: ReleaseRef | null };
  releases: Release[];
  total?: number;
  compared?: [string, string];
  difference?: { kind: string; key: string; change: "added" | "removed" | "changed" }[];
};
export type DefineType = {
  type: string;
  release: ReleaseRef;
  basedOn: ReleaseRef | null;
  objects: { added: string[]; changed: string[]; removed: string[]; unchanged: number };
  refs: { test: ReleaseRef | null; live: ReleaseRef | null; liveBefore: ReleaseRef | null };
  receipt: Receipt & { actor?: string };
  liveReceipt: (Receipt & { actor?: string }) | null;
  note: string;
};
export type MoveLive = {
  receipt: Receipt;
  before: ReleaseRef | null;
  after: ReleaseRef;
  typesBefore: string[];
  typesAfter: string[];
  note: string;
};
export type ListEntities = {
  type: string;
  account: string;
  created: number;
  entities: {
    number: number;
    entity: string;
    attributes: Record<string, unknown>;
    recordedAt?: string | null;
  }[];
};
