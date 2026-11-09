// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; unannotated record members. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: Q51a's FIFO lives in the candidate API: one subject at a time,
// up to eight commands per engine transaction; independent subjects share 16 permits.
// Inspiration: R39 3.2 and Q51a. Rejected: serializing in the trace driver (hides the candidate's cost).
export class SubjectQueue {
  constructor(perform, { concurrency = 16, groupSize = 8 } = {}) {
    if (
      typeof perform !== "function" ||
      !Number.isSafeInteger(concurrency) ||
      concurrency < 1 ||
      concurrency > 16 ||
      !Number.isSafeInteger(groupSize) ||
      groupSize < 1 ||
      groupSize > 8
    )
      throw new Error("invalid candidate limits");
    this.perform = perform;
    this.concurrency = concurrency;
    this.groupSize = groupSize;
    this.subjects = new Map();
    this.ready = [];
    this.running = 0;
    this.maxRunning = 0;
    this.groups = [];
  }
  submit(command) {
    return new Promise((resolve, reject) => {
      let s = this.subjects.get(command.subject);
      if (!s) {
        s = { busy: false, queued: false, jobs: [] };
        this.subjects.set(command.subject, s);
      }
      s.jobs.push({ command, resolve, reject });
      if (!s.busy && !s.queued) {
        s.queued = true;
        this.ready.push(command.subject);
      }
      this.pump();
    });
  }
  stopPending(reason) {
    let canceled = 0;
    for (const s of this.subjects.values())
      for (const job of s.jobs.splice(0)) {
        canceled++;
        job.reject(reason);
      }
    this.ready = [];
    return canceled;
  }
  pump() {
    while (this.running < this.concurrency && this.ready.length) {
      const subject = this.ready.shift(),
        s = this.subjects.get(subject);
      s.queued = false;
      s.busy = true;
      // A retry is isolated: one duplicate must not abort seven new commands with it.
      const jobs = [s.jobs.shift()];
      if (!jobs[0].command.resend && !jobs[0].command.retry)
        while (
          jobs.length < this.groupSize &&
          s.jobs.length &&
          !s.jobs[0].command.resend &&
          !s.jobs[0].command.retry
        )
          jobs.push(s.jobs.shift());
      this.running++;
      this.maxRunning = Math.max(this.maxRunning, this.running);
      this.groups.push(jobs.length);
      Promise.resolve()
        .then(() => this.perform(jobs.map((j) => j.command)))
        .then((results) => {
          if (results.length !== jobs.length) throw new Error("group result count");
          results.forEach((r, i) => jobs[i].resolve(r));
        })
        .catch((error) => jobs.forEach((j) => j.reject(error)))
        .finally(() => {
          this.running--;
          s.busy = false;
          if (s.jobs.length) {
            s.queued = true;
            this.ready.push(subject);
          } else this.subjects.delete(subject);
          this.pump();
        });
    }
  }
}

// [EXP-P2X2] Why: the candidate composition owns transaction grouping and duplicate resolution.
// Rejected: placing admission or engine writes in the open-loop offer driver.
export function compose(rt, prefix, mode = "C") {
  const queue = new SubjectQueue(
    async (group) => {
      const effect = rt.adapter.withTransaction(
        rt.Effect.forEach(group, (e) =>
          rt.triples.transact(
            rt.ops(`${prefix}:${e.seq}`, e.actualSubject ?? e.subject, e.facts, e.correction),
            { commandId: `${prefix}:${e.seq}` },
          ),
        ),
        { replaySafe: true },
      );
      const outcome = await rt.run(
        rt.Effect.match(effect, {
          onSuccess: (results) => ({ results }),
          onFailure: (error) => ({ error }),
        }),
      );
      if (outcome.error) {
        const e = outcome.error;
        if (group.length === 1 && e?._tag === "CommandAlreadyCommittedError") {
          const record = await rt.run(rt.triples.transaction(e.transactionId));
          if (!record || record.commandId !== `${prefix}:${group[0].seq}`)
            throw new Error("duplicate original receipt missing");
          return [
            { result: { txId: record.txId, position: record.position }, duplicate: true, record },
          ];
        }
        throw e;
      }
      return outcome.results.map((result) => ({ result, duplicate: false }));
    },
    { concurrency: mode === "A0" ? 1 : 16, groupSize: mode === "A0" ? 1 : 8 },
  );
  return {
    submit(event) {
      return queue.submit(
        mode === "A0" ? { ...event, actualSubject: event.subject, subject: "global" } : event,
      );
    },
    stopPending(reason) {
      return queue.stopPending(reason);
    },
    get running() {
      return queue.running;
    },
    get groups() {
      return queue.groups;
    },
    get maxRunning() {
      return queue.maxRunning;
    },
    identity: {
      decider: "XTDB serial indexer",
      stampSource: mode === "C" ? "engine system time packed with ordinal" : "A0 scope counter",
      fifo: mode === "C" ? "per subject" : "global control",
      groupMax: mode === "C" ? 8 : 1,
      writerInFlightMax: mode === "C" ? 16 : 1,
      queueBound: "unbounded; measured against TARGETS progress bar",
    },
  };
}
