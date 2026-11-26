// [DX-SRV3-fix1] The ordered block token of a save request the SDK built, read the way the gateway reads it
// (subject_save.clj ordered-bounds): the one-byte form first, then the wide form, each accepted only when the request's
// new IDs are exactly that block's first ordinals.
// Found on 2026-11-26 (scorecard at 1 billion, cell p6-50-loaded): a wide journal ID `_tx/<23 characters>W00` also
// matches the one-byte pattern `_tx/<24 characters>00`, its 24th character being `W`. Taking the first pattern that
// matched (`one ?? wide`) gave the wrong token, the two-digit ordinals did not fit, and the card marked a wide ordered
// save as the general identity; its check then failed on the per-subject writer that rightly took it. The toy's tape
// saves (4 to 15 facts) never needed a wide block.
// Rejected: testing the wide pattern first (a one-byte token can end in `W` too; only the IDs tell them apart).
const oneByte = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{23})00$/;
const wide = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{22})W00$/;

export type BlockToken = { token: string; kind: "one-byte" | "wide" };

export function blockToken(txId: string | undefined, newIds: Iterable<string>): BlockToken | undefined {
  const ids = [...newIds].sort();
  if (ids.length === 0) return undefined;
  const fits = (token: string, digits: number) =>
    ids.every((id, i) => id === token + i.toString(16).toUpperCase().padStart(digits, "0"));
  const one = oneByte.exec(txId ?? "")?.[1];
  if (one !== undefined && ids.length <= 256 && fits(one, 2)) return { token: one, kind: "one-byte" };
  const w = wide.exec(txId ?? "")?.[1];
  if (w !== undefined && ids.length <= 4096 && fits(w, 3)) return { token: w, kind: "wide" };
  return undefined;
}
