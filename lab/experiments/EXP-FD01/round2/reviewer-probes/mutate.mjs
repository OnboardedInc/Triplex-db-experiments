// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [CX-VFD01] Why: place a real second transaction between the existing after-effect and checkpoint hooks.
// Rejected: committing before after-effect (the existing exception rollback test already catches that simpler mutant).
export function splitTransaction(source) {
  const needle = 'crash?.("after-effect");';
  if (source.split(needle).length !== 2) throw Error('Split mutant binding changed');
  return source.replace(needle, needle + '\n      this.db.exec("COMMIT; BEGIN IMMEDIATE");');
}
