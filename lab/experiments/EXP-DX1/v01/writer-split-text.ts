// [DX-INT5] The card's line for one cell's per-subject writer check (adopted.ts checkWriterSplit), in the save line
// reviewer's wording: "per-subject writer: N eligible by the narrow rule, M taken", "not exercised" when N is 0, never
// a silent pass. Shared by the arm's log line and the card's table (adopted-card.ts), with the per-card rule.
import assert from "node:assert/strict";

export type WriterSplit = { keyed: number; eligible: number; taken: number; ran: boolean; rule?: "off" | "narrow" | "wide-or-owners" };
export function writerSplitText(x: WriterSplit) {
  if (!x.ran) return `per-subject writer: option off in this arm (${x.keyed} keyed saves)`;
  const by = x.rule === "wide-or-owners" ? "with the wide writer or owners named" : "by the narrow rule";
  if (x.eligible === 0) return `per-subject writer: not exercised (0 eligible ${by} of ${x.keyed} keyed)`;
  return `per-subject writer: ${x.eligible} eligible ${by}, ${x.taken} taken (of ${x.keyed} keyed)`;
}

/**
 * The per-card rule (F5, "the share the arm's tape predicts"): when any arm ran with the per-subject option on, at
 * least one such arm has N > 0 eligible saves and every one of them took the per-subject writer (M = N). The tape is
 * deterministic, so a card with no such arm did not exercise the writer it claims.
 */
export function checkCardWriterSplits(splits: readonly WriterSplit[]) {
  const on = splits.filter((x) => x.ran);
  if (on.length === 0) return { arms: 0, exercised: 0 };
  const exercised = on.filter((x) => x.eligible > 0 && x.taken === x.eligible).length;
  assert(exercised > 0, `no arm with the per-subject option on had eligible saves that all took it (${on.length} arms: ` +
    on.map(writerSplitText).join("; ") + ")");
  return { arms: on.length, exercised };
}
