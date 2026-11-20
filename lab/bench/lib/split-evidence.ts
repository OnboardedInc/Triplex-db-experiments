import { once } from "node:events";
import fs from "node:fs";
import { createInterface } from "node:readline";

type SplitStep = {
  position: number | null;
  firstStepEnd: number | null;
  acknowledgedAt: number | null;
  secondStepStart: number | null;
  secondStepEnd: number | null;
};

// [DX-RD1] Why: join every split with the same ordered copy-apply events while retaining only unsettled steps and a sample.
// Rejected: two run-length JSON logs of otherwise finished splits, or calling an ACK an application witness.
export class SplitFold {
  private readonly times = new Map<number, number>();
  private readonly unknown = new Map<number, number>();
  private readonly sample: (SplitStep & { appliedAt: number | null })[] = [];
  private pending: SplitStep[] = [];
  private appliedThrough = -Infinity;
  private readonly counts = { selected: 0, complete: 0, acknowledgedBetween: 0, appliedBetween: 0, applicationUnknown: 0 };

  add(row: SplitStep) {
    this.counts.selected++;
    if (row.firstStepEnd !== null && row.secondStepStart !== null && row.secondStepEnd !== null) this.counts.complete++;
    if (row.acknowledgedAt !== null && this.between(row, row.acknowledgedAt)) this.counts.acknowledgedBetween++;
    if (!this.place(row)) {
      if (this.pending.length >= 131_072) throw Error("Bounded split join exceeded its unsettled steps limit");
      this.pending.push(row);
    }
  }

  apply(rows: readonly { position: number; at: number }[]) {
    if (!rows.length) return;
    for (const { position, at } of rows) {
      if (!Number.isSafeInteger(position) || !Number.isFinite(at) || at < this.appliedThrough) throw Error("Invalid ordered replica application witness");
      this.appliedThrough = at;
      if (!this.times.has(position)) this.times.set(position, at);
      this.counts.applicationUnknown -= this.unknown.get(position) ?? 0;
      this.unknown.delete(position);
    }
    this.drain(false);
  }

  private between(row: SplitStep, at: number) {
    return row.firstStepEnd !== null && row.secondStepStart !== null && at > row.firstStepEnd && at <= row.secondStepStart;
  }

  private place(row: SplitStep, terminal = false) {
    const at = row.position === null ? undefined : this.times.get(row.position);
    if (at === undefined && row.position !== null && row.secondStepStart !== null && row.secondStepStart >= this.appliedThrough && !terminal) return false;
    if (at === undefined) {
      this.counts.applicationUnknown++;
      if (!terminal && row.position !== null) this.unknown.set(row.position, (this.unknown.get(row.position) ?? 0) + 1);
    } else if (this.between(row, at)) this.counts.appliedBetween++;
    if (this.sample.length < 32) this.sample.push({ ...row, appliedAt: at ?? null });
    return true;
  }

  private drain(terminal: boolean) {
    let count = 0;
    for (const row of this.pending) if (!this.place(row, terminal)) this.pending[count++] = row;
    this.pending.length = count;
  }

  finish() {
    this.drain(true);
    return { ...this.counts, file: null, sample: this.sample.map(row => ({ ...row, appliedAt: row.position === null ? null : this.times.get(row.position) ?? null })) };
  }
}
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
