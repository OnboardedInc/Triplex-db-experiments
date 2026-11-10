import fs from "node:fs";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0, w0Basis } from "../../../bench/lib/w0-world.ts";
// [DX-H8] Why: repeat the same verified outputs at a later basis to isolate publication from world fetching.
// Rejected: synthetic datoms or clearing persisted outbox state to make larger frames look cheaper.
export async function publicationMatrix(report: any, dir: string) {
  const comp = await openComposition(report.composition, report.lane, report.scope);
  try {
    const records = report.sweep.metrics
      .toSorted((a: any, b: any) => a.page - b.page)
      .flatMap((m: any) =>
        JSON.parse(fs.readFileSync(path.join(dir, `activation-${m.page}.json`), "utf8")),
      );
    const observations = [];
    for (const size of [64, 256, 1024]) {
      const basis = w0Basis({
        position: await comp.currentPosition(),
        validAt: report.activation.basis.validAt,
      });
      for (let offset = 0; offset < records.length; offset += size) {
        const batch = records
          .slice(offset, offset + size)
          .map((r: any) => ({ ...r.record, basis }));
        const startedAtEpochMs = performance.timeOrigin + performance.now();
        const result: any = await comp.publishOutbox(batch);
        const ackAtEpochMs = performance.timeOrigin + performance.now();
        if (result.retry || result.deliveries.length)
          throw Error("matrix must ACK a fresh command without duplicate effects");
        const observation = {
          mode: "steady-republication-after-verified-activation",
          size,
          subjects: batch.length,
          startedAtEpochMs,
          ackAtEpochMs,
          wallMs: ackAtEpochMs - startedAtEpochMs,
          ...result.timing,
        };
        observations.push(observation);
        console.log("[H8 publication] " + JSON.stringify(observation));
      }
    }
    fs.writeFileSync(
      path.join(dir, "publication-matrix.json"),
      JSON.stringify(observations, null, 2) + "\n",
    );
    return observations;
  } finally {
    await comp.close();
  }
}
