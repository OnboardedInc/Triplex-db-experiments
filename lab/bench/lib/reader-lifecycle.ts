// [DX-R3] Why: worker readiness or a clean exit is not a drained observation prefix.
// Rejected: swallowing errors after ready, or qualifying a run whose reader disappeared before its stopped ACK.
export class ReaderLifecycle {
  stopped = false;
  readonly failures: string[] = [];
  acknowledgeStop() { this.stopped = true; }
  error(error: unknown) { this.failures.push(String(error)); }
  exit(code: number) { if (!this.stopped) this.failures.push(`reader exited ${code} without a drained stopped acknowledgement`); }
}

// [DX-R3] Why: a stop ACK may certify only a fully drained producer, including sweep reads.
// Rejected: letting a deadline turn unfinished reads into an apparently clean prefix.
export function requireDrained(loops: number, reads: number) {
  if (loops || reads) throw Error(`reader failed to drain: ${loops} loops, ${reads} reads still active`);
}

// [DX-R3] Why: each private producer port must retain exactly one ordered batch per sequence number.
// Rejected: accepting a duplicate or missing batch and inflating goodput from otherwise correct copied observations.
export class BatchSequence {
  private next = 1;
  accept(id: number) { if (id !== this.next++) throw Error("Observation producer batch sequence mismatch"); }
}
