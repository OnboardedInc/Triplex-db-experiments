import { readErasure, recheckErasure, withErasure } from "../../../bench/lib/datomic-erasure.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { W0, V_W0, canonical } from "../../../bench/lib/w0-world.ts";
import { buildIndex, selectRelease, eadRelease } from "../../../bench/lib/w0-selector.ts";
import { selectorOracle } from "../../../bench/lib/w0-selector-oracle.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { pageRoots } from "../../../bench/lib/w0-page-outbox.ts";
import { pageWireState } from "../../../bench/lib/w0-page-check.ts";
import { parseOutbox, readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { answerIndependent } from "../../../bench/lib/thin-activation.ts";
import { Account, policyId, digest } from "./account.ts";

const wire = (state: any) => ({
  items: state.items.map((x: any) => ({ ...x, payload: JSON.parse(x.payload) })),
  pending: state.pending.map((x: any) => ({ ...x, payload: JSON.parse(x.payload) })),
  subjects: state.subjects,
});
// [DX-INT1] Why: the immutable import projection feeds ACT1 in 256-person pages. Its ordinary durable publisher fences each covered position, including empty decisions.
// Rejected: using the demand reader for a sweep, one private SQLite database per subject, or inferring coverage from a count alone.
export async function activate(
  account: Account,
  dir: string,
  release: W0.CompiledRelease,
  basisPosition: number,
  checkpoint: () => Promise<void>,
) {
  assert.equal(W0.compileRelease(release.doc).hash, release.hash);
  const needCompleteAnswers =
    !answerIndependent(release.hash) && release.hash !== eadRelease().hash;
  const priorSourceReads = account.sourceWorldReads;
  const authority = await readErasure(account.comp);
  const sequence = authority?.seq;
  const roster = account.roster(),
    cut = {
      scope: account.comp.scopeName!,
      generation: account.binding,
      basis: { tx: basisPosition, validTime: W0.POPULATION_VALID_TIME },
      frontier: basisPosition,
      erasure: sequence === undefined ? "fresh-synthetic-scope" : String(sequence),
      source: account.binding,
    };
  const stem = path.join(
    dir,
    "release-" +
      account.first +
      "-" +
      digest(cut.scope + release.hash + basisPosition).slice(0, 16),
  );
  fs.mkdirSync(stem);
  const oracle = new DomainOracle(selectorOracle(stem, release.name === "R1" ? W0.R2 : release));
  const receiptFile = path.join(path.basename(stem), "page-receipts.jsonl");
  fs.writeFileSync(path.join(dir, receiptFile), "", { flag: "wx" });
  const logical = createHash("sha256");
  const pageHashes = createHash("sha256"),
    rosterBytes = createHash("sha256").update("["),
    results = createHash("sha256");
  let covered = 0,
    candidates = 0,
    excluded = 0,
    full = 0,
    bodies = 0,
    domain = 0,
    guards = 0,
    commits = 0;
  account.db.exec("CREATE TABLE IF NOT EXISTS outboxes(i INTEGER PRIMARY KEY,body TEXT NOT NULL)");
  const from = account.db.prepare("SELECT body FROM outboxes WHERE i=?"),
    save = account.db.prepare("INSERT OR REPLACE INTO outboxes VALUES(?,?)");
  try {
    for (let first = account.first; first < account.first + account.count; ) {
      await checkpoint();
      if (sequence !== undefined) await recheckErasure(account.comp, sequence);
      const end = Math.min(first + 256 - (first % 256), account.first + account.count);
      const worlds = new Map<string, W0.World>();
      const ids = [] as string[];
      for (let i = first; i < end; i++) {
        const id = policyId(i);
        ids.push(id);
        worlds.set(
          id,
          await account.world(i, basisPosition, needCompleteAnswers, authority ?? null),
        );
      }
      const file = path.join(stem, "current-index.sqlite"),
        cursor = path.join(stem, "current-checkpoint.sqlite");
      const seal = buildIndex(file, cut, ids, worlds.values());
      const records: W0.EvaluationRecord[] = [];
      const selection = selectRelease({
        index: { file, seal },
        checkpoint: cursor,
        attempt: account.binding + "/" + first,
        cut,
        roster: ids,
        release,
        world: (id) => worlds.get(id)!,
        onPage: (rows) => {
          for (const r of rows) records.push(W0.recordOf(r.output));
        },
      });
      candidates += selection.candidates;
      excluded += selection.excluded;
      full += selection.full;
      assert.equal(records.length, ids.length);
      const rosterFrame = {
        subjects: ids,
        basis: { tx: BigInt(basisPosition), validTime: cut.basis.validTime },
        release: release.hash,
      };
      if (sequence !== undefined) await recheckErasure(account.comp, sequence);
      const ack = await withErasure(sequence, () =>
        publishChanged(account.comp, records, {
          layout: "page-cut",
          roster: rosterFrame,
          frameSize: 256,
          inflight: 1,
        }),
      );
      assert(
        ack.coverage &&
          ack.coverage.roster === digest(canonical(ids)) &&
          ack.coverage.size === ids.length,
      );
      const claims = ack.responses.map((r) => {
        assert("span" in r && r.span && r.txId && Number(r.position) > basisPosition);
        return [r.span, r.input, r.txId, r.position, r.members] as const;
      });
      const positions = claims.map((r) => Number(r[3]));
      assert(positions.length);
      assert.equal(
        ack.coverage.receipts,
        digest(canonical(claims.map((r) => digest(canonical(r))))),
      );
      const receiptBytes = canonical([first, seal, selection.binding, ack.coverage, claims]) + "\n";
      fs.appendFileSync(path.join(dir, receiptFile), receiptBytes);
      pageHashes.update(receiptBytes);
      commits += ack.commits;
      bodies += Number(ack.bodies ?? 0);
      const native = await readOutboxAt(account.comp, pageRoots(ids), Math.max(...positions));
      for (const [j, record] of records.entries()) {
        const i = first + j;
        assert.equal(record.subject, policyId(i));
        rosterBytes.update((covered++ ? "," : "") + JSON.stringify(record.subject));
        results.update(canonical(record) + "\n");
        logical.update(
          canonical([
            record.subject,
            record.release,
            record.workItems.map((w) => [w.id, w.kind, w.payload]),
          ]) + "\n",
        );
        const prior = from.get(i);
        const old = prior ? parseOutbox(String(prior.body)) : W0.EMPTY_OUTBOX;
        const next = W0.publish(old, [record]).state;
        const actual = JSON.parse(canonical(pageWireState(native.rows, record.subject)));
        assert.deepEqual(actual, JSON.parse(canonical(wire(next))));
        guards++;
        if (
          account.count <= 512 ||
          i === account.first ||
          i === account.first + account.count - 1 ||
          (i - account.first) % Math.max(1, Math.floor(account.count / 100)) === 0
        ) {
          const expected = JSON.parse(
            await oracle.call("evaluate", {
              world: account.oracleWorld(i, basisPosition),
              release: release.name,
              basis: cut.basis,
            }),
          );
          const recordWire = {
            basis: expected.basis,
            subject: expected.subject,
            release: expected.release,
            workItems: expected.workItems,
          };
          const observed = JSON.parse(
            canonical({
              ...record,
              workItems: record.workItems.map((w) => ({ ...w, payload: JSON.parse(w.payload) })),
            }),
          );
          assert.deepEqual(observed, recordWire);
          const pub = JSON.parse(
            await oracle.call("publish", {
              state: prior ? JSON.parse(canonical(wire(old))) : emptyWireState(),
              evaluations: [recordWire],
            }),
          );
          assert.deepEqual(actual, pub.state);
          domain++;
        }
        save.run(i, canonical(next));
      }
      fs.unlinkSync(file);
      fs.unlinkSync(cursor);
      first = end;
    }
  } finally {
    oracle.close();
  }
  assert.equal(rosterBytes.update("]").digest("hex"), roster);
  assert.equal(guards, account.count);
  const sourceWorldReads = account.sourceWorldReads - priorSourceReads;
  const required = Number(
    account.db
      .prepare("SELECT count(*) AS n FROM people WHERE born<=? AND dirty<=?")
      .get(basisPosition, basisPosition)!.n,
  );
  assert.equal(sourceWorldReads, required, "A cold subject was read or a dirty world was missed");
  assert.equal(full + candidates + excluded, covered);
  return {
    cut,
    release: release.hash,
    covered,
    roster,
    guardReadbacks: guards,
    sourceWorldReads,
    certifiedWorlds: covered - sourceWorldReads,
    oracle: domain,
    candidates,
    excluded,
    full,
    bodies,
    commits,
    records: results.digest("hex"),
    receipts: pageHashes.digest("hex"),
    receiptFile,
    logical: logical.digest("hex"),
  };
}
export { eadRelease };
