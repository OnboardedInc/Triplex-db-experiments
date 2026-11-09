// [CX-VFD01] Why: place a real second transaction between the existing after-effect and checkpoint hooks.
// Rejected: committing before after-effect (the existing exception rollback test already catches that simpler mutant).
export function splitTransaction(source) {
  const needle = 'crash?.("after-effect");';
  if (source.split(needle).length !== 2) throw Error('Split mutant binding changed');
  return source.replace(needle, needle + '\n      this.db.exec("COMMIT; BEGIN IMMEDIATE");');
}
