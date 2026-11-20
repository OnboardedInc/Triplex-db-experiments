import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openInstance } from "./instance.ts";
import { liveGate } from "./live-gate.ts";
import {
  openSnapshot,
  snapshotProfiles,
  snapshotSamples,
  snapshotSeed,
  writeSnapshot,
  type SeedPlan,
} from "./snapshot.ts";
import { personId } from "./model.ts";
import type { StackOptions } from "./stack.ts";

type Options = Omit<StackOptions, "directory"> & {
  out: string;
  tier: string;
  plan: SeedPlan;
  keepBundle?: boolean;
  sourceHead: string;
  timingClass: string;
  slot?: string;
  beforeSeal?: () => void;
};

export async function runSnapshot(options: Options) {
  const { out, tier, plan, prefix, sourceHead, timingClass, ...settings } = options;
  const fixture = snapshotSeed(plan);
  const buildStart = performance.now();
  const scratch = join(out, "capture");
  const initial = await openInstance({
    ...settings,
    prefix,
    directory: scratch,
    apiPort: 0,
    fixture,
  });
  let restored: Awaited<ReturnType<typeof openInstance>> | undefined;
  let buildClosed = false;
  let keepBundle = false;
  const archive = join(out, "capture.dump");
  const bundle = join(out, "bundle");
  const inventory = { ps: [], volume: [], network: [], image: [] };
  try {
    const capture = await initial.ready;
    const checkpoint = await capture.snapshotCheckpoint(plan);
    const buildPeaks = await initial.stack.memoryPeaks();
    const buildMs = performance.now() - buildStart;
    const dumpStart = performance.now();
    await initial.stack.dump(archive);
    const sourceBytes = await initial.stack.databaseBytes();
    const published = await writeSnapshot(archive, bundle, {
      tier,
      plan,
      run: prefix,
      checkpoint,
      codec: capture.urls.codec,
    });
    const dumpMs = performance.now() - dumpStart;
    await rm(archive);
    const closed = await initial.close(true);
    buildClosed = true;
    assert.equal(closed.ps.length + closed.network.length + closed.volume.length, 0);
    assert(closed.image.length === (settings.cachedImage ? 0 : 1));
    const restoreStart = performance.now();
    const snapshot = await openSnapshot(bundle, join(out, "cache"), tier, settings.signal);
    assert.equal(snapshot.checksum, published.checksum);
    restored = await openInstance({
      ...settings,
      prefix,
      apiPort: 0,
      directory: join(out, "restore"),
      cachedImage: settings.cachedImage ?? prefix,
      fixture: snapshot,
    });
    const ready = await restored.ready;
    const account = snapshotProfiles(plan)[0]!;
    const person = personId(account, 0);
    const response = await fetch(restored.server.url + "/api/current", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, personId: person }),
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(response.status, 200);
    const data = (await response.json()) as {
      position: number;
      records: Array<{ entityId: string; attribute: string; value: unknown }>;
    };
    assert.equal(data.position, checkpoint.head);
    const root = Object.fromEntries(
      data.records.filter((r) => r.entityId === person).map((r) => [r.attribute, r.value]),
    );
    const expected = snapshotSamples(plan).at(-1)!.byPerson.get(person)!.get(person)!;
    assert.deepEqual(root, Object.fromEntries(expected));
    const firstReadMs = performance.now() - restoreStart;
    const databaseBytes = await restored.stack.databaseBytes();
    assert(databaseBytes > 0 && sourceBytes > 0);
    const restorePeaks = await restored.stack.memoryPeaks();
    if (plan === "small") await liveGate(restored.server.url, snapshot.checksum);
    assert.deepEqual(await restored.close(), inventory);
    await assert.rejects(
      fetch(restored.server.url + "/health", { signal: AbortSignal.timeout(3000) }),
    );
    const receipt = {
      tier,
      plan,
      sourceHead,
      timingClass,
      checkpoint,
      prefix,
      slot: options.slot,
      manifestSha256: published.checksum,
      gatewaySource: ready.gatewaySource,
      ...capture.seedCounts,
      downloadBytes:
        published.manifestBytes +
        published.manifest.objects.reduce((total, obj) => total + obj.bytes, 0),
      sourceBytes,
      databaseBytes,
      buildMs,
      dumpMs,
      buildBootMs: capture.stackMs,
      replayMs: capture.seedMs,
      restoreBootMs: ready.stackMs,
      restoreMs: ready.urls.restoreMs,
      firstReadMs,
      buildPeaks,
      restorePeaks,
      cleanup: inventory,
    };
    // [DX-PLAY1] Why: seal measurements only after the fresh restored process verifies and shuts down.
    // Rejected: recording the size of an unbootable dump as a usable tier.
    options.beforeSeal?.();
    await writeFile(join(out, "snapshot.json"), JSON.stringify(receipt, null, 2) + "\n", {
      flag: "wx",
    });
    keepBundle = !!options.keepBundle;
    return receipt;
  } finally {
    if (!buildClosed) await initial.close();
    if (restored) await restored.close();
    if (buildClosed) assert.deepEqual(await initial.stack.stop(), inventory);
    await rm(archive, { force: true });
    if (!keepBundle) await rm(bundle, { recursive: true, force: true });
  }
}
