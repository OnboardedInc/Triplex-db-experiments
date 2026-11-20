import { performance } from "node:perf_hooks";

export type AdmissionKind = "publish" | "save";
export type AdmissionPolicy = "fifo" | "priority";
export type AdmissionTurn = {
  entered: number;
  waitingForSavesMs: number;
  waitingForPublishesMs: number;
  waitingSaves: number;
};
export type WriteAttempt = {
  started: number;
  cut?: number;
  prepared?: number;
  nativeAck?: number;
  finished?: number;
  conflict?: true;
  recovered?: true;
};
export type PublishObservation = {
  turn?: AdmissionTurn;
  attempts: WriteAttempt[];
};
type Job = { kind: AdmissionKind; order: number; run: (entered: number) => Promise<void> };

export class AccountAdmission {
  private readonly publish: Job[] = [];
  private readonly save: Job[] = [];
  private order = 0;
  private active?: { kind: AdmissionKind; at: number };
  private saveWork = 0;
  private publishTurns = 0;

  readonly policy: AdmissionPolicy;
  constructor(policy: AdmissionPolicy) {
    this.policy = policy;
  }

  private saveClock(t: number) {
    return this.saveWork + (this.active?.kind === "save" ? t - this.active.at : 0);
  }

  run<T>(kind: AdmissionKind, work: (turn: AdmissionTurn) => Promise<T>): Promise<T> {
    const offered = performance.now();
    const saveClock = this.saveClock(offered);
    const waitingSaves = this.save.length + Number(this.active?.kind === "save");
    return new Promise((resolve, reject) => {
      this[kind].push({
        kind,
        order: this.order++,
        run: async (entered) => {
          const waitingForSavesMs = this.saveClock(entered) - saveClock;
          try {
            resolve(
              await work({
                entered,
                waitingForSavesMs,
                waitingForPublishesMs: Math.max(0, entered - offered - waitingForSavesMs),
                waitingSaves,
              }),
            );
          } catch (e) {
            reject(e);
          }
        },
      });
      this.pump();
    });
  }

  private pump() {
    if (this.active) return;
    const publish = this.publish[0],
      save = this.save[0];
    // [DX-ACT2] Why: a newly offered Publish can pass unsent saves before it observes the cut. A save gets a turn after eight publishes. Rejected: sending all saves to the nonpreemptible native FIFO or retrying their moving head.
    const takePublish =
      publish &&
      (!save || (this.policy === "priority" ? this.publishTurns < 8 : publish.order < save.order));
    const next = (takePublish ? this.publish : this.save).shift();
    if (!next) return;
    this.publishTurns = next.kind === "publish" ? Math.min(8, this.publishTurns + 1) : 0;
    const entered = performance.now();
    this.active = { kind: next.kind, at: entered };
    void next.run(entered).finally(() => {
      if (next.kind === "save") this.saveWork += performance.now() - entered;
      this.active = undefined;
      this.pump();
    });
  }
}
