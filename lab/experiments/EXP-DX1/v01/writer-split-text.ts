// [DX-INT5] The card's line for one cell's per-subject writer check (adopted.ts checkWriterSplit): "0 eligible of N
// keyed" is printed, never a silent pass. Shared by the arm's log line and the card's table (adopted-card.ts).
export type WriterSplit = { keyed: number; eligible: number; taken: number; ran: boolean };
export function writerSplitText(x: WriterSplit) {
  if (!x.ran) return `not checked (no per-subject writer in this arm; ${x.keyed} keyed)`;
  return `${x.eligible} eligible of ${x.keyed} keyed, ${x.taken} took the per-subject writer`;
}
