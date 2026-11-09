// [EXP-K01-R4] Why: owner reads and writes must share one exclusion boundary across processes. Rejected: atomic rename after an unlocked read (can overwrite a newer failed verification).
import { withDirLock, readOwner, atomicJson } from './lib.mjs';
export const ownerStateLock = (info, action) => withDirLock(`${info.lockDir}.state`, action, { label: `${info.lane}-${info.slot} owner state` });
// [EXP-K01-R6] Why: An undefined transition return explicitly means no mutation; next/current fallback never supplies missing runtime evidence, and callers require current attempt identity before PASS. Rejected: converting a failed observation into successful content.
export async function updateOwner(info, update) {
  return ownerStateLock(info, () => {
    const current = readOwner(info);
    const next = update(current);
    if (next && typeof next.then === 'function') throw new Error('owner transition callback must be synchronous');
    if (next !== undefined) atomicJson(info.ownerFile, next);
    return next ?? current;
  });
}
