// [DX-W1] Why: deterministic and live generated fact IDs share a 26-character ASCII encoding.
// Rejected: sorting all IDs or extending the proof to arbitrary imported string collations.
export function historyIdentityBounds(ids: readonly string[]): [string, string] | undefined {
  if (ids.length < 2) return undefined;
  const seen = new Set<string>();
  let low = ids[0]!,
    high = low;
  for (const id of ids) {
    if (id.length !== 26 || /[^0-9A-Z]/.test(id) || seen.has(id)) return undefined;
    seen.add(id);
    if (id < low) low = id;
    if (id > high) high = id;
  }
  return [low, high];
}
