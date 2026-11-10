// [DX-H3] Why: a depth-one sample cannot establish depth-ten flatness. Rejected: comparing phase labels after failed growth.
export function historyDepthsComplete(growth: readonly any[], subjects: number): boolean {
  return subjects > 0 && [3, 10].every(depth => growth.some(g => g.targetDepth === depth && g.reachedDepth >= depth && g.subjects === subjects && !g.incomplete));
}
// [DX-H3] Why: head-read failures must remain explicit without discarding the measured report. Rejected: inventing a final head from an ACK floor.
export async function observeFinalHead(read: () => Promise<number>, errors: string[]): Promise<number | null> {
  try { const head = await read(); if (!Number.isSafeInteger(head) || head < 0) throw Error('invalid source head'); return head; }
  catch (error) { errors.push(`Final source position unavailable: ${String(error)}`); return null; }
}
