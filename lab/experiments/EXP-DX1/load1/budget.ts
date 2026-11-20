import assert from "node:assert/strict";

// [DX-LOAD2] Why: sample the complete nonpreemptible peer-future interval and leave room for variation.
// Rejected: deriving a Datomic service deadline from fact count or cutting an already submitted command.
export const maxBulkFacts = 32;
export class SerialBudget {
  private last: { facts: number; ms: number }[] = [];
  private limit = 1;
  constructor(readonly ms: number) {
    assert(Number.isFinite(ms) && ms > 0 && ms <= 32);
  }
  observe(facts: number, ms: number) {
    assert(
      Number.isSafeInteger(facts) &&
        facts > 0 &&
        facts <= maxBulkFacts &&
        Number.isFinite(ms) &&
        ms > 0,
    );
    this.last.push({ facts, ms });
    if (this.last.length > 16) this.last.shift();
    if (ms > this.ms) this.limit = Math.max(1, Math.floor(this.limit / 2));
    else if (ms <= this.ms * 0.7)
      this.limit = Math.min(maxBulkFacts, Math.max(facts + 1, this.limit + 2));
  }
  next() {
    // A single source group is indivisible. Refuse sustained over-budget reports at the minimum.
    const small = this.last.filter((s) => s.facts <= 10);
    if (
      this.limit <= 10 &&
      small.length >= 6 &&
      small.slice(-6).filter((s) => s.ms > this.ms).length >= 4
    )
      return undefined;
    return this.limit;
  }
}
