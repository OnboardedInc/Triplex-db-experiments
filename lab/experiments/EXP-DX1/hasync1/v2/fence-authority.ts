import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FenceProof } from "../supervisor.ts";

export type FenceOwner = Omit<FenceProof, "method">;
type FenceRequest = FenceOwner & { challenge: string };
type Cut = { owner: FenceOwner; generation: number; ticket: string };
type Journal = {
  owner: FenceOwner;
  generation: number;
  phase: "armed" | "revoking" | "isolated";
  ticket?: string;
  challenge?: string;
};
type Readback = Cut & { power: "off"; restartLatched: true };
export interface IndependentInterlock {
  trip(cut: Cut): Promise<void>;
  readBack(cut: Cut): Promise<Readback>;
}

function ownerOf({ cluster, epoch, primary, transactor }: FenceOwner) {
  const owner = { cluster, epoch, primary, transactor };
  assert(
    Object.values(owner).every((v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(v)),
  );
  return owner;
}

function syncDir(dir: string) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

// [DX-HASYNC1] Why: losing the management runtime must not restore the old host's write authority. Rejected: time-based leases, process memory and a power-off pulse that allows auto-reboot.
export class FenceAuthority {
  #last: Promise<unknown> = Promise.resolve();
  constructor(
    readonly file: string,
    readonly interlock: IndependentInterlock,
  ) {
    assert(path.isAbsolute(file));
  }
  static armNew(file: string, owner: FenceOwner, generation: number) {
    assert(Number.isSafeInteger(generation) && generation > 0);
    const fd = fs.openSync(file, "wx", 0o600);
    try {
      fs.writeFileSync(
        fd,
        JSON.stringify({ owner: ownerOf(owner), generation, phase: "armed" } satisfies Journal),
      );
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    syncDir(path.dirname(file));
  }
  #read(): Journal {
    const j: Journal = JSON.parse(fs.readFileSync(this.file, "utf8"));
    assert.deepEqual(j.owner, ownerOf(j.owner));
    assert(Number.isSafeInteger(j.generation) && j.generation > 0);
    assert(["armed", "revoking", "isolated"].includes(j.phase));
    if (j.phase !== "armed") {
      assert.match(j.ticket ?? "", /^[a-f0-9-]{36}$/);
      assert.match(j.challenge ?? "", /^[a-f0-9-]{36}$/);
    }
    return j;
  }
  #save(j: Journal) {
    const next = this.file + "." + randomUUID();
    const fd = fs.openSync(next, "wx", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(j));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(next, this.file);
    syncDir(path.dirname(this.file));
  }
  #serialized<T>(job: () => T | Promise<T>) {
    const op = this.#last.then(job);
    this.#last = op.catch(() => undefined);
    return op;
  }
  #cut(j: Journal): Cut {
    return { owner: j.owner, generation: j.generation, ticket: j.ticket! };
  }
  async #readBack(j: Journal) {
    const expected = this.#cut(j);
    assert.deepEqual(await this.interlock.readBack(expected), {
      ...expected,
      power: "off",
      restartLatched: true,
    });
  }
  boot(owner: FenceOwner, generation: number) {
    return this.#serialized(() => {
      try {
        const j = this.#read();
        assert.deepEqual(ownerOf(owner), j.owner);
        return j.generation === generation && j.phase === "armed";
      } catch {
        return false;
      }
    });
  }
  fence(request: FenceRequest) {
    return this.#serialized(async () => {
      const j = this.#read();
      assert.deepEqual(ownerOf(request), j.owner);
      assert.match(request.challenge, /^[a-f0-9-]{36}$/);
      // Persist revocation before attempting the hardware mutation. Any restart or partial failure denies boot.
      const going: Journal = {
        ...j,
        phase: "revoking",
        ticket: j.ticket ?? randomUUID(),
        challenge: request.challenge,
      };
      this.#save(going);
      await this.interlock.trip(this.#cut(going));
      await this.#readBack(going);
      this.#save({ ...going, phase: "isolated" });
      return { challenge: request.challenge, ticket: going.ticket! };
    });
  }
  observe(request: FenceRequest & { ticket: string }) {
    return this.#serialized(async () => {
      const j = this.#read();
      assert.deepEqual(ownerOf(request), j.owner);
      assert(
        j.phase === "isolated" && j.ticket === request.ticket && j.challenge === request.challenge,
      );
      await this.#readBack(j);
      return {
        ...j.owner,
        challenge: j.challenge,
        ticket: j.ticket,
        state: "isolated",
        restartLatched: true,
      };
    });
  }
}
