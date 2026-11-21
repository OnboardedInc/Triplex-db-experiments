import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { openComposition } from "../../../bench/lib/composition.ts";
import { memberOf, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { Snapshot } from "../load1/snapshot.ts";
import { identity, sha } from "../load1/source.ts";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { scopeKey } from "../v01/adopt.ts";
import { facts, roster, source, subject, width, type Account, type Profile } from "./population.ts";
import { fileHash, type Image, type Parent, type Proof } from "./seal.ts";

export async function head(client: DatomicClient, db: string) {
  const basis = await client.begin(db);
  await client.release(db, basis.handle);
  return basis.position;
}

const tuple = (e: string, a: string, v: unknown) => memberOf(e, a, v);
export async function readPerson(
  client: DatomicClient,
  key: string,
  account: Account,
  i: number,
  cut: number,
  validAt = SEED_VALID_FROM,
) {
  const world = await client.readDemandWorld(
    key,
    subject(account, i),
    { validAt, recordedPosition: cut },
    false,
  );
  assert(world, "Pinned demand read unavailable");
  return world.triples;
}

async function memberProbes(
  reader: DatomicClient,
  parent: Parent,
  accounts: Account[],
  cut: number,
) {
  const key = scopeKey(parent.scope);
  for (const account of accounts) {
    for (const i of [...new Set([0, 1, Math.floor(account.people / 2), account.people - 1])]) {
      const root = subject(account, i);
      const actual = await readPerson(reader, key, account, i, cut);
      const expected = facts(account, i)
        .filter((row) => account.kind === "thin" || row.e === root)
        .map((row) => tuple(row.e, row.a, row.v));
      const observed = (
        account.kind === "thin" ? actual : actual.filter((row) => row.entityId === root)
      ).map((row) => tuple(row.entityId, row.attribute, row.value));
      assert.deepEqual(observed.sort(), expected.sort(), "Pinned member facts differ");
    }
  }
}

async function terminal(
  client: DatomicClient,
  db: string,
  at: number,
  commandId: string,
  correlation: string,
) {
  const { transactions } = await client.request<{ transactions: [string, number, string[]][] }>(
    "POST",
    "/v2/db/" + db + "/transactions",
    { after: at - 1, limit: 1 },
  );
  assert.equal(transactions.length, 1);
  const [tx, position, encoded] = transactions[0]!;
  assert.equal(position, at);
  const rows = encoded.map(decodeRowText);
  assert.equal(rows.find((row) => row.attribute === ":_tx/command-id")?.value_string, commandId);
  assert.equal(
    rows.find((row) => row.attribute === ":_tx/correlation-id")?.value_string,
    correlation,
  );
  assert.equal(await client.claim(db, commandId, at), tx);
  return tx;
}

export async function checkRealisticPeer(client: DatomicClient, image: Image, probes = true) {
  const { parent, proof } = image;
  const key = scopeKey(parent.scope);
  const scope = await client.create(key, "lean", true, 35_000);
  assert(!scope.created && scope.strictRecordClocks && scope.db === parent.db);
  assert.equal(await head(client, parent.db), proof.cut);
  const fixture = source(
    image.accounts.filter((a) => a.kind !== "deep"),
    parent.imageSha,
    image.source,
  );
  const frame = fixture.batches(proof.first).next().value;
  assert(frame && frame.first === proof.first);
  const meta = identity(parent.scope, fixture.seal, width, frame);
  assert.equal(proof.terminal, meta.commandId);
  assert.equal(proof.manifest, "load1/manifest/" + sha(fixture.namespace));
  const marker = await terminal(
    client,
    parent.db,
    parent.cut + 1,
    proof.manifest,
    sha(JSON.stringify([parent.scope, fixture.seal, width])),
  );
  assert(marker);
  assert.equal(
    await terminal(client, parent.db, proof.cut, meta.commandId, meta.correlationId),
    proof.terminalTx,
  );
  if (probes) await memberProbes(client, parent, image.accounts, proof.cut);
}

export async function load(
  parent: Parent,
  profile: Profile,
  revision: string,
  url: string,
  out: string,
  checkResources: () => void,
) {
  process.env.DATOMIC_URL = url;
  process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
  process.env.DX_STRICT_RECORD_CLOCKS = "1";
  process.env.DX_SERVER_RECORD_TIME = "1";
  const reader = new DatomicClient(url, 35_000);
  try {
    const key = scopeKey(parent.scope);
    const initial = await reader.create(key, "lean", true, 35_000);
    assert.equal(initial.db, parent.db);
    assert(initial.strictRecordClocks && (profile === "toy" || !initial.created));
    const accounts = roster(profile);
    const ledger = path.join(out, "extension-ledger.sqlite");
    const comp = await openComposition("reach", "datomic", parent.scope);
    let verified: Omit<Proof, "ledgerSha">;
    try {
      if (profile === "toy") {
        const base = source(
          accounts.filter((a) => a.kind === "deep"),
          parent.imageSha,
          revision,
          true,
        );
        const before = await comp.currentPosition();
        const snapshot = await Snapshot.open(
          comp,
          base,
          base.groups,
          width,
          path.join(out, "toy-parent.sqlite"),
        );
        try {
          await snapshot.drain(1);
          const result = await snapshot.verify(true, undefined, {
            exclusiveSuffixAfter: before,
            feedOnly: true,
          });
          parent.cut = result.cut;
          parent.facts = result.facts;
        } finally {
          snapshot.close();
        }
      }
      assert.equal(await head(reader, parent.db), parent.cut);
      const extension = accounts.filter((a) => a.kind !== "deep");
      const fixture = source(extension, parent.imageSha, revision);
      const snapshot = await Snapshot.open(comp, fixture, fixture.groups, width, ledger);
      let checkAt = 0;
      try {
        const started = Date.now();
        await snapshot.drain(profile === "toy" ? 1 : 2, {
          async beforeSend() {
            if (Date.now() < checkAt) return;
            checkAt = Date.now() + 60_000;
            checkResources();
            console.log(JSON.stringify({ stage: "loading", cursor: snapshot.cursor() }));
          },
        });
        const drained = Date.now();
        console.log(
          JSON.stringify({
            stage: "verifying",
            loadSeconds: (drained - started) / 1000,
            ...snapshot.totals(),
          }),
        );
        const result = await snapshot.verify(true, undefined, {
          pageSize: 4,
          readDepth: 4,
          exclusiveSuffixAfter: parent.cut,
          feedOnly: profile !== "toy",
          assertionSweep: profile === "toy",
        });
        assert.equal(result.cut, parent.cut + 1 + result.observed);
        assert.equal(result.cut, await head(reader, parent.db));
        await memberProbes(reader, parent, accounts, result.cut);
        // [DX-REAL1] Why: the terminal source interval is read from the verified durable feed.
        // Rejected: assuming depth-two concurrent frames finish in source order.
        const { transactions } = await reader.request<{
          transactions: [string, number, string[]][];
        }>("POST", "/v2/db/" + parent.db + "/transactions", { after: result.cut - 1, limit: 1 });
        const [[terminalTx, position, rows]] = transactions;
        assert.equal(position, result.cut);
        const command = rows
          .map(decodeRowText)
          .find((row) => row.attribute === ":_tx/command-id")?.value_string;
        assert(command);
        const first = Number(command.split("/").at(-1));
        const frame = fixture.batches(first).next().value;
        assert(frame && frame.first === first);
        const meta = snapshot.frameIdentity(frame);
        assert.equal(command, meta.commandId);
        assert.equal(
          await terminal(reader, parent.db, position, command, meta.correlationId),
          terminalTx,
        );
        verified = {
          ...result,
          manifest: snapshot.manifest,
          terminal: command,
          terminalTx,
          first,
          sourceSeal: fixture.seal,
        };
      } finally {
        snapshot.close();
      }
    } finally {
      await comp.close();
    }
    assert(!fs.existsSync(ledger + "-wal"));
    return { ...verified, ledgerSha: await fileHash(ledger) };
  } finally {
    reader.close();
  }
}
