import { loadReplayPin } from "./evaluate.ts";
import fs from "node:fs";
import { DomainOracle, equalBytes, emptyWireState } from "./w0-gates.ts";
import { W0, canonical, worldOf, w0Basis, type PositionBasis } from "./w0-world.ts";
import type { CompositionHandle } from "./composition.ts";
import { CountLedger } from "./w0-counts.ts";
export class TrafficOracle {
  replay = new DomainOracle("./w0-replay.py", JSON.stringify);
  domain = new DomainOracle();
  state: any = emptyWireState();
  ledger!: CountLedger;
  worlds = 0;
  outputs = 0;
  publications = 0;
  readonly comp: CompositionHandle;
  readonly log: string;
  constructor(comp: CompositionHandle, log: string) {
    this.comp = comp;
    this.log = log;
  }
  replayPin: any;
  async init() {
    this.replayPin = await loadReplayPin();
    if (!this.comp.commandLog) throw Error("G1 independent command-intent log required");
    this.ledger = new CountLedger(await this.comp.storeCounts());
    const commands = this.comp.commandLog();
    for (let i = 0; i < commands.length; i += 64)
      await this.replay.call("append", commands.slice(i, i + 64));
    equalBytes(
      "G9 replay start",
      canonical(this.ledger.start),
      canonical(JSON.parse(await this.replay.call("counts", {}))),
    );
  }
  async append(operations: readonly any[], meta: any, receipt: any) {
    this.ledger.add(operations, receipt);
    fs.appendFileSync(this.log, JSON.stringify({ operations, meta, receipt }) + "\n");
    await this.replay.call("append", [{ operations, meta, receipt }]);
  }
  async world(subject: string, basis: PositionBasis) {
    return JSON.parse(await this.replay.call("world", { subject, basis }));
  }
  async checkWorld(subject: string, rows: readonly any[], basis: PositionBasis) {
    const expected = await this.world(subject, basis);
    equalBytes("G1 O-REPLAY world", canonical(worldOf(subject, rows)), canonical(expected));
    this.worlds++;
    return expected;
  }
  async checkRecords(records: readonly any[], basis: PositionBasis, activations: readonly any[]) {
    const expectedRecords: any[] = [];
    for (const r of records) {
      const world = await this.world(r.subject, basis);
      equalBytes("G1 sweep world", canonical(r.world), canonical(world));
      const output = JSON.parse(
        await this.domain.call("reconcile", { world, activations, basis: w0Basis(basis) }),
      );
      if (output.error) throw Error("G2 oracle error: " + canonical(output));
      equalBytes("G2 reconcile", W0.outputJson(r.output), canonical(output));
      // [EXP-P5-R3] Why: publication expectations must come from independent reconcile outputs. Rejected: computing expectations from the observed worker record (circular check).
      const expectedRecord = {
        subject: output.subject,
        release: output.release,
        basis: output.basis,
        workItems: output.workItems,
      };
      const actualRecord = {
        ...r.record,
        workItems: r.record.workItems.map((w: any) => ({ ...w, payload: JSON.parse(w.payload) })),
      };
      equalBytes("G2 evaluation record", canonical(actualRecord), canonical(expectedRecord));
      expectedRecords.push(expectedRecord);
      this.outputs++;
    }
    return expectedRecords;
  }
  publishing: Promise<void> = Promise.resolve();
  publish(records: readonly any[], basis: PositionBasis, activations: readonly any[]) {
    const job = this.publishing.then(() => this.publishPage(records, basis, activations));
    this.publishing = job;
    return job;
  }
  async publishPage(records: readonly any[], basis: PositionBasis, activations: readonly any[]) {
    const expectedRecords = await this.checkRecords(records, basis, activations);
    const result = JSON.parse(
      await this.domain.call("publish", { state: this.state, evaluations: expectedRecords }),
    );
    if (result.error) throw Error("G5 oracle error");
    const actual = await this.comp.publishOutbox(records.map((r) => r.record));
    const observed = actual.deliveries.map((d) => ({
      ...d,
      payload: typeof d.payload === "string" ? JSON.parse(d.payload) : d.payload,
    }));
    equalBytes("G5 deliveries", canonical(observed), canonical(result.deliveries));
    if (!actual.retry) {
      if (!actual.operations || !actual.receipt) throw Error("G9 publication receipt missing");
      await this.append(actual.operations, actual.meta ?? {}, actual.receipt);
    }
    this.state = result.state;
    this.publications++;
  }
  async finish() {
    const counts = await this.ledger.finish(this.comp);
    equalBytes(
      "G9 replay end",
      canonical(counts.expected),
      canonical(JSON.parse(await this.replay.call("counts", {}))),
    );
    return {
      replayPin: this.replayPin,
      worlds: this.worlds,
      outputs: this.outputs,
      publications: this.publications,
      counts,
      commands: this.log,
    };
  }
  close() {
    this.replay.close();
    this.domain.close();
  }
}
