// [DX-R3] Why: worker readiness or a clean exit is not a drained observation prefix.
// Rejected: swallowing errors after ready, or qualifying a run whose reader disappeared before its stopped ACK.
export class ReaderLifecycle {
  stopped = false;
  readonly failures: string[] = [];
  acknowledgeStop() { this.stopped = true; }
  error(error: unknown) { this.failures.push(String(error)); }
  exit(code: number) { if (!this.stopped) this.failures.push(`reader exited ${code} without a drained stopped acknowledgement`); }
}
