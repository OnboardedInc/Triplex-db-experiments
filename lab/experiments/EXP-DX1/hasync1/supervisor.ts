import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

export const timeouts = {
  poll: 250,
  misses: 3,
  syncStall: 2000,
  control: 1800,
  detect: 15000,
  fence: 8000,
  drain: 4000,
  replay: 5000,
  promote: 5000,
  broker: 23000,
  jdbcConnectSeconds: 1,
  heartbeat: 5000,
  request: 15000,
  setup: 120000,
  rejoin: 15000,
} as const;

export const lsn = (x: string) => {
  assert.match(x, /^[0-9A-F]+\/[0-9A-F]+$/);
  return BigInt("0x" + x.split("/")[0]) * 2n ** 32n + BigInt("0x" + x.split("/")[1]);
};
const plannedReplayBudgetBytes = 16n * 2n ** 20n;
export async function wait<T>(label: string, ms: number, probe: () => Promise<T | undefined>) {
  const deadline = performance.now() + ms;
  do {
    const result = await probe();
    if (result !== undefined) return result;
    await sleep(timeouts.poll);
  } while (performance.now() < deadline);
  throw Error("Deadline waiting for " + label);
}

export type PrimarySample = {
  configured: boolean;
  sync: boolean;
  flush: string;
  waitingMs: number;
};
export type Candidate = { cluster: string; receive: string; replay: string; timeline: number };
export type FenceProof = {
  cluster: string;
  epoch: string;
  primary: string;
  transactor: string;
  method: "startup-latch-and-stop" | "independent-power-off";
};
type ExpectedFence = Omit<FenceProof, "method">;
export type Durability = "two-copy" | "single-copy-after-fence";
export type Port = {
  identity: ExpectedFence & { timeline: number };
  seal(): void;
  drain(): Promise<void>;
  primary(): Promise<PrimarySample | undefined>;
  candidate(): Promise<Candidate>;
  fence(planned: boolean): Promise<{ proof: FenceProof; finalFlush?: string }>;
  promote(): Promise<number>;
  activate(policy: Durability, kind: "fault" | "planned"): Promise<void>;
  publish(policy: Durability): void;
  observe(stage: string, observation: unknown): void;
};

export class Supervisor {
  #closed = false;
  #floor: string;
  constructor(
    private readonly port: Port,
    confirmedFlush: string,
  ) {
    lsn(confirmedFlush);
    this.#floor = confirmedFlush;
  }

  async run(kind: "fault" | "planned", policy: Durability) {
    assert(!this.#closed, "One promotion per authority epoch");
    this.#closed = true;
    const p = this.port;
    const mark = (name: string, data: unknown = null) =>
      p.observe(name, { at: performance.now(), data });
    if (kind === "fault") {
      let misses = 0;
      await wait("primary death or blocked synchronous replication", timeouts.detect, async () => {
        // [DX-HASYNC1] Why: a reachable primary can be unable to finish a protected commit. Rejected: TCP connect as a replication health signal.
        const sample = await p.primary();
        if (sample && !sample.configured) {
          p.seal();
          throw Error("Primary changed its protected commit configuration");
        }
        if (sample?.sync && lsn(sample.flush) > lsn(this.#floor)) this.#floor = sample.flush;
        const bad = !sample || !sample.sync || sample.waitingMs >= timeouts.syncStall;
        misses = bad ? misses + 1 : 0;
        if (misses >= timeouts.misses) {
          mark("detected", { misses, sample, floor: this.#floor });
          return true;
        }
        return undefined;
      });
      // [DX-HASYNC1] Why: the same replication stall can mean the standby died. Rejected: stopping a live primary before verifying an eligible survivor.
      this.#candidate(await p.candidate());
    } else {
      const sample = await p.primary();
      assert(
        sample?.configured && sample.sync && sample.waitingMs < timeouts.syncStall,
        "Plan needs a healthy copy",
      );
      if (lsn(sample.flush) > lsn(this.#floor)) this.#floor = sample.flush;
      await wait("live pre-cut replay", timeouts.replay, async () => {
        const c = await p.candidate();
        this.#candidate(c);
        return lsn(c.replay) >= lsn(this.#floor) &&
          lsn(c.receive) - lsn(c.replay) <= plannedReplayBudgetBytes
          ? true
          : undefined;
      });
    }
    p.seal();
    mark("sealed");
    if (kind === "planned") await p.drain();
    const { proof, finalFlush } = await p.fence(kind === "planned");
    const { timeline, ...expected } = p.identity;
    const { method, ...witness } = proof;
    assert(method === "startup-latch-and-stop" || method === "independent-power-off");
    assert.deepEqual(
      witness satisfies ExpectedFence,
      expected,
      "Fence proof is for a different owner",
    );
    if (kind === "planned") {
      assert(
        finalFlush && lsn(finalFlush) >= lsn(this.#floor),
        "Final flush has no complete prefix",
      );
      this.#floor = finalFlush;
    }
    mark("fenced", { proof, finalFlush });
    // [DX-HASYNC1] Why: promotion follows the latch and the survivor's complete durable receive prefix. Rejected: a timeout as evidence of death, or a primary-side estimate of received WAL.
    const received = await p.candidate();
    this.#candidate(received);
    const replay = await wait("surviving WAL prefix", timeouts.replay, async () => {
      const c = await p.candidate();
      this.#candidate(c);
      return lsn(c.replay) >= lsn(received.receive) && lsn(c.replay) >= lsn(this.#floor)
        ? c
        : undefined;
    });
    mark("prefix", { replay, floor: this.#floor, receiveAfterFence: received.receive });
    const next = await p.promote();
    assert(next > timeline, "Promotion did not create a new timeline");
    mark("promoted", { next });
    await p.activate(policy, kind);
    p.publish(policy);
    mark("routed", { policy });
  }

  #candidate(c: Candidate) {
    assert.equal(c.cluster, this.port.identity.cluster, "Wrong standby cluster");
    assert.equal(c.timeline, this.port.identity.timeline, "Wrong standby timeline");
    assert(lsn(c.replay) <= lsn(c.receive));
  }
}
