import { requireCounts } from "./w0-gates.ts";
import type { CompositionHandle } from "./composition.ts";
// [EXP-P5-R3] Why: expected growth follows submitted operations and ACK identities, never observed end totals. Rejected: reusing start or trusting a returned count (F3).
export class CountLedger {
  expected: Record<string, number>;
  retired = new Set<string>();
  receipts: any[] = [];
  readonly start: Record<string, number>;
  constructor(start: Record<string, number>) {
    this.start = start;
    this.expected = { ...start };
  }
  add(operations: readonly any[], receipt: any) {
    if (
      !receipt ||
      receipt.position !== this.expected.position + 1 ||
      receipt.triples.length !== operations.filter((o) => o.op === "assert").length
    )
      throw Error("G9 receipt/operation mismatch");
    for (const op of operations)
      if (op.op === "retract") {
        if (this.retired.has(op.id)) throw Error("G9 duplicate retirement");
        this.retired.add(op.id);
        this.expected.retired++;
      } else if (op.op === "assert") this.expected.assertions++;
      else throw Error("G9 unsupported operation");
    this.expected.position = receipt.position;
    this.expected.frames++;
    this.receipts.push({ operations, receipt });
  }
  async finish(comp: CompositionHandle) {
    const end = await comp.storeCounts();
    requireCounts(end, this.expected);
    return { start: this.start, expected: this.expected, end, transactions: this.receipts.length };
  }
}
