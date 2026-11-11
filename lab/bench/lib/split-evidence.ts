import { once } from "node:events";
import fs from "node:fs";
import { createInterface } from "node:readline";
// [DX-R3] Why: join actual source application timestamps after all reader batches drain; retain crash-safe raw steps.
// Rejected: classifying every later ACK as a version straddle (application may precede the first step).
export async function completeSplitEvidence(
  directory: string,
  applied: readonly { position: number; at: number }[],
) {
  const source = `${directory}-split-steps.jsonl`,
    target = `${directory}-split-complete.jsonl`;
  const counts = {
    selected: 0,
    complete: 0,
    acknowledgedBetween: 0,
    appliedBetween: 0,
    applicationUnknown: 0,
  };
  if (!fs.existsSync(source)) return { ...counts, file: null };
  const times = new Map<number, number>();
  const applicationLog = `${directory}-copy-applied.jsonl`;
  const applications = fs.existsSync(applicationLog)
    ? fs.readFileSync(applicationLog, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line)) : applied;
  for (const x of applications) {
    if (!Number.isSafeInteger(x.position) || !Number.isFinite(x.at)) throw Error("Invalid copy application witness");
    if (!times.has(x.position)) times.set(x.position, x.at);
  }
  const output = fs.createWriteStream(target, { flags: "wx" });
  const finished = new Promise<void>((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });
  void finished.catch(() => {});
  try {
    for await (const line of createInterface({
      input: fs.createReadStream(source),
      crlfDelay: Infinity,
    })) {
      const row = JSON.parse(line),
        appliedAt = times.get(row.position) ?? null;
      counts.selected++;
      if (row.firstStepEnd !== null && row.secondStepStart !== null && row.secondStepEnd !== null)
        counts.complete++;
      if (
        row.firstStepEnd !== null &&
        row.secondStepStart !== null &&
        row.acknowledgedAt > row.firstStepEnd &&
        row.acknowledgedAt <= row.secondStepStart
      )
        counts.acknowledgedBetween++;
      if (appliedAt === null) counts.applicationUnknown++;
      else if (
        row.firstStepEnd !== null &&
        row.secondStepStart !== null &&
        appliedAt > row.firstStepEnd &&
        appliedAt <= row.secondStepStart
      )
        counts.appliedBetween++;
      if (!output.write(JSON.stringify({ ...row, appliedAt }) + "\n")) await once(output, "drain");
    }
    output.end();
    await finished;
  } catch (error) {
    output.destroy();
    throw error;
  }
  return { ...counts, file: target };
}
