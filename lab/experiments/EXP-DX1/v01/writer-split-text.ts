// [DX-INT5] The card's lines for one cell's per-subject writer check (adopted.ts checkWriterSplit), and the per-card
// rule (the coordinator's ruling of 2026-11-25 on the save line reviewer's additions). Two populations, never summed:
// the tape's keyed saves the active rule lets the per-subject writer take, and the card's own saves.
import assert from "node:assert/strict";

export type WriterSplit = {
  keyed: number; eligible: number; taken: number; ran: boolean; rule?: "off" | "narrow" | "wide-or-owners";
  own?: number; ownTaken?: number; keyedGeneral?: number;
};
export function writerSplitLines(x: WriterSplit): string[] {
  if (!x.ran) return [`per-subject writer: option off in this arm (${x.keyed} keyed saves)`];
  if (x.rule === "wide-or-owners")
    return [`per-subject writer (wide writer or owners named): ${x.eligible} eligible of ${x.keyed} keyed, ${x.taken} taken; ` +
      `${x.keyedGeneral ?? x.keyed - x.taken} keyed saves went to the general writer`, `own saves: ${x.own ?? 0}, ${x.ownTaken ?? 0} taken`];
  return [x.eligible === 0 ? `per-subject writer: 0 eligible by the narrow rule of ${x.keyed} keyed`
    : `per-subject writer: ${x.eligible} eligible by the narrow rule of ${x.keyed} keyed, ${x.taken} taken`,
    `own saves: ${x.own ?? 0}, ${x.ownTaken ?? 0} taken`];
}
export const writerSplitText = (x: WriterSplit) => writerSplitLines(x).join("; ");

export const noTapeSaveLine = "no tape save was eligible for the per-subject writer in this card (wide writer off)";

/**
 * The per-card rule. Wide writer off (the default card): met by an arm with N > 0 and M = N in either population
 * (keyed by the narrow rule, or own saves); met only by own saves, the card says so in one plain line. Wide writer on
 * or owners named (the product save path): own saves do not count; at least one arm has keyed N > 0 and M > 0 (F5).
 * M = N is not asserted there: the share the tape predicts on that path is not stated yet (open).
 */
export function checkCardWriterSplits(splits: readonly WriterSplit[]) {
  const on = splits.filter((x) => x.ran);
  if (on.length === 0) return { arms: 0, rule: "off" as const, summary: [] as string[] };
  const wide = on.some((x) => x.rule === "wide-or-owners");
  if (wide) {
    const met = on.filter((x) => x.rule === "wide-or-owners" && x.eligible > 0 && x.taken > 0).length;
    assert(met > 0, `no arm on the product save path had keyed saves that took the per-subject writer (${on.map(writerSplitText).join(" | ")})`);
    return { arms: on.length, rule: "wide-or-owners" as const, summary: [] as string[] };
  }
  const keyedMet = on.filter((x) => x.eligible > 0 && x.taken === x.eligible).length;
  const ownMet = on.filter((x) => (x.own ?? 0) > 0 && x.ownTaken === x.own).length;
  assert(keyedMet + ownMet > 0, `no arm with the per-subject option on had saves eligible for it that all took it (${on.map(writerSplitText).join(" | ")})`);
  return { arms: on.length, rule: "narrow" as const, summary: keyedMet === 0 ? [noTapeSaveLine] : [] };
}
