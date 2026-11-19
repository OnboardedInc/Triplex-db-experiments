import { Dispatcher, Receiver } from "./dispatch.ts";
import { activation, millis, type Event, type Store } from "./store.ts";
import type { W0 } from "../../../bench/lib/w0-world.ts";
import type { Format } from "./decision.ts";

// [DX-ACT1] Why: the native feed is the durable work queue. A release wake costs no subject visit, and only a real future boundary arms a timer. Rejected: polling every idle account or making publication wait for recipients.
export class NoticeService {
  private readonly worker: Dispatcher;
  private readonly receiver: Receiver;
  private readonly store: Store;
  private readonly now: () => string;
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private dirty = false;
  private closed = false;
  private failure: unknown;
  constructor(
    store: Store,
    receiver: Receiver,
    format: Format = store.profile,
    now = () => new Date().toISOString().replace("Z", "000Z"),
  ) {
    this.store = store;
    this.worker = new Dispatcher(store, format);
    this.receiver = receiver;
    this.now = now;
  }
  async activate(id: string, release: W0.CompiledRelease, at: string, from = at) {
    const receipt = await activation(this.store, id, release, at, from);
    this.wake();
    return receipt;
  }
  async save(id: string, event: Event, ops: readonly any[]) {
    const receipt = await this.store.input(id, event, ops);
    this.wake();
    return receipt;
  }
  wake() {
    if (this.closed || this.failure) return;
    this.dirty = true;
    if (!this.running) {
      this.running = Promise.resolve()
        .then(async () => {
          while (this.dirty && !this.closed) {
            this.dirty = false;
            await this.worker.drain();
            await this.receiver.drain(this.store);
            const due = this.worker.nextDue;
            if (this.timer) clearTimeout(this.timer);
            if (due) {
              const now = this.now();
              if (due <= now) {
                await this.worker.wakeDue(now);
                this.dirty = true;
              } else this.arm(due);
            }
          }
        })
        .catch((e) => {
          this.failure = e;
        })
        .finally(() => {
          this.running = undefined;
          if (this.dirty && !this.closed && !this.failure) this.wake();
        });
    }
  }
  private arm(due: string) {
    const remaining = millis(due) - millis(this.now());
    if (remaining <= 0) {
      this.wake();
      return;
    }
    this.timer = setTimeout(
      () => this.arm(due),
      Math.min(2147483647, Math.max(1, Math.ceil(remaining))),
    );
  }
  async settled() {
    while (this.running) await this.running;
    if (this.failure) throw this.failure;
  }
  async close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    try {
      await this.settled();
    } finally {
      this.worker.close();
    }
  }
}
