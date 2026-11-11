export type SplitTarget = { subject: number; seq: number };
// [DX-R3] Why: an offered command is already queued/in flight; uniform future selection held 231/256 readers idle.
// Rejected: removing split reads or adding writer commands to make snapshots easier to test.
export function splitTarget(pending: readonly SplitTarget[], soon: readonly SplitTarget[], pick: (n: number) => number, policy: "pending" | "mixed"): SplitTarget {
  if (policy === "pending") {
    if (pending.length) return pending[pick(pending.length)]!;
    // [DX-R3] Why: during gaps between offers, the next due command preserves a real straddle without a random 250 ms hold.
    // Rejected: uniformly selecting distant future commands whenever the offered set briefly becomes empty.
    if (soon.length) return soon[0]!;
  }
  const total = pending.length + soon.length;
  if (!total) return { subject: -1, seq: -1 };
  const k = pick(total);
  return k < pending.length ? pending[k]! : soon[k - pending.length]!;
}
