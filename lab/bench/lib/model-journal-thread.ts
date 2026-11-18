import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import type { Receipt } from "./composition.ts";
import type { Commit } from "./model.ts";
import {
  ModelJournal,
  journalReceipt,
  type JournalContext,
  type JournalEntry,
  type JournalSeal,
} from "./model-journal.ts";

const CAPACITY = 256;
type Request = { entry: JournalEntry; seq: number } | { seal: number };

// [DX-DRV1] Why: the sender retains only journal credits while exact expectation bytes are appended off-thread.
// Rejected: waiting for disk on each finish, or accumulating an unbounded queue of cloned receipts.
export class ModelJournalThread {
  readonly file: string;
  readonly context: JournalContext;
  private readonly worker: Worker;
  private readonly progress = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  private submitted = 0;
  private peakOutstanding = 0;
  private closing = false;
  private failure: Error | undefined;
  private rejectSeal?: (error: Error) => void;

  constructor(file: string, context: JournalContext) {
    this.file = file;
    this.context = context;
    this.worker = new Worker(new URL("./model-journal-thread.ts", import.meta.url), {
      workerData: { file, context, progress: this.progress },
    });
    this.worker.on("error", (error: Error) => this.fail(error));
    this.worker.on("exit", (code) => {
      if (code !== 0 || !this.closing || this.rejectSeal)
        this.fail(Error(`Expected-state worker exited before sealing (${code})`));
    });
  }

  private fail(error: Error) {
    this.failure ??= error;
    this.rejectSeal?.(this.failure);
  }

  private append(entry: JournalEntry) {
    if (this.failure) throw this.failure;
    if (this.closing) throw Error("Expected-state worker is sealing");
    const outstanding = this.submitted - Atomics.load(this.progress, 0);
    if (outstanding >= CAPACITY) {
      this.fail(Error(`Expected-state worker exceeded ${CAPACITY} queued frames`));
      throw this.failure;
    }
    this.worker.postMessage({ entry, seq: this.submitted } satisfies Request);
    this.submitted++;
    this.peakOutstanding = Math.max(this.peakOutstanding, outstanding + 1);
  }

  bindReceipt(operations: readonly any[], receipt: Receipt, actor?: string) {
    this.append(journalReceipt(operations, receipt, actor));
  }
  addCommit(subject: number, commit: Commit) {
    this.append({ kind: "commit", subject, commit });
  }

  async seal() {
    this.closing = true;
    try {
      if (this.failure) throw this.failure;
      const seal = await new Promise<JournalSeal>((resolve, reject) => {
        this.rejectSeal = reject;
        this.worker.once("message", resolve);
        this.worker.postMessage({ seal: this.submitted } satisfies Request);
      });
      if (seal.frames !== this.submitted || Atomics.load(this.progress, 0) !== this.submitted)
        throw Error("Expected-state worker seal differs from submitted count");
      return {
        journal: new ModelJournal(this.file, this.context, seal),
        queue: {
          capacity: CAPACITY,
          peakOutstanding: this.peakOutstanding,
          frames: this.submitted,
        },
      };
    } finally {
      this.rejectSeal = undefined;
      await this.worker.terminate();
    }
  }
}

if (!isMainThread && parentPort && workerData?.progress && workerData?.context) {
  const port = parentPort;
  const { file, context, progress } = workerData as {
    file: string;
    context: JournalContext;
    progress: Int32Array;
  };
  const journal = new ModelJournal(file, context);
  port.on("message", (message: Request) => {
    const written = Atomics.load(progress, 0);
    if ("entry" in message) {
      if (message.seq !== written) throw Error("Expected-state worker sequence mismatch");
      journal.append(message.entry);
      Atomics.add(progress, 0, 1);
    } else {
      if (message.seal !== written) throw Error("Expected-state worker drain mismatch");
      port.postMessage(journal.seal());
      port.close();
    }
  });
}
