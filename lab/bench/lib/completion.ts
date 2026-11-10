// [DX-H3] Why: a depth-one sample cannot establish depth-ten flatness. Rejected: comparing phase labels after failed growth.
export function historyDepthsComplete(growth: readonly any[], subjects: number): boolean {
  return (
    subjects > 0 &&
    [3, 10].every((depth) =>
      growth.some(
        (g) =>
          g.targetDepth === depth &&
          g.reachedDepth >= depth &&
          g.subjects === subjects &&
          !g.incomplete,
      ),
    )
  );
}
// [DX-H3] Why: head-read failures must remain explicit without discarding the measured report. Rejected: inventing a final head from an ACK floor.
export async function observeFinalHead(
  read: () => Promise<number>,
  errors: string[],
): Promise<number | null> {
  try {
    const head = await read();
    if (!Number.isSafeInteger(head) || head < 0) throw Error("invalid source head");
    return head;
  } catch (error) {
    errors.push(`Final source position unavailable: ${String(error)}`);
    return null;
  }
}
// [DX-H3] Why: unchanged sweep worlds prove no mutation isolation if none of the mutations committed.
// Rejected: passing the post-capture check from correct worlds with missing/failed mutation receipts.
export function mutationsAfterCapture(
  positions: readonly unknown[] | undefined,
  expected: number,
  captured: number,
): boolean {
  return (
    expected > 0 &&
    positions?.length === expected &&
    positions.every((p) => typeof p === "number" && Number.isSafeInteger(p) && p > captured)
  );
}
