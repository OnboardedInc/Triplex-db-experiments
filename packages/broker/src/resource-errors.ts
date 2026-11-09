// [EXP-P2B-R4] Why: unpublished duplicates and rejected WAL admissions are known bounded refusals, not duplicate receipts or outcome-unknown writes.
// Rejected: exposing a claim before its journal is readable, or fail-stopping after a write rejected before COMMIT.
import { WriteError, ReadError } from "@triplex-build/triplex/runtime";
export class DuplicatePublicationTimeout extends WriteError {
  readonly reason = "duplicate-publication-timeout" as const;
  constructor(
    readonly commandId: string,
    readonly waitedMs: number,
  ) {
    super({ message: `Command ${commandId} publication was not readable within ${waitedMs} ms` });
  }
}
export class WalCapacityExceeded extends WriteError {
  readonly reason = "wal-capacity-exceeded" as const;
  constructor(message: string) {
    super({ message });
  }
}
export class ReadOperationLimit extends ReadError {
  readonly reason = "read-operation-limit" as const;
  constructor(message: string) {
    super({ message });
  }
}
