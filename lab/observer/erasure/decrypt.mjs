import { createDecipheriv, createHash } from 'node:crypto';

// [EXP-ER01-S] Why: authenticated opens independently test every retained key copy.
// Rejected: treating key deletion flags or one failed decryption as crypto-erasure.
function open(key, box, aad) {
  const bytes = Buffer.from(box, 'base64');
  if (key.length !== 32 || bytes.length < 28) throw new Error('invalid AES-GCM key/box');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]);
}
function tryOpen(key, box, aad) {
  try { return open(key, box, aad); } catch { return null; }
}
export function decryptEvidence(input) {
  const roots = input.roots.map(value => Buffer.from(value, 'hex'));
  if (!roots.length || roots.some(key => key.length !== 32)) throw new Error('invalid root key inventory');
  const epochs = [], issues = [];
  for (const row of input.epochs) {
    let opened = false;
    for (const root of roots) {
      const value = tryOpen(root, row.wrapped, JSON.stringify([row.tenant, row.epoch]));
      if (value?.length === 32) { epochs.push({ ...row, value }); opened = true; }
    }
    if (!opened && !row.candidateOnly) issues.push('epoch copy does not authenticate with supplied roots');
  }
  const envelopes = input.envelopes.map(item => {
    if (!item.envelope.startsWith('txe1.')) throw new Error('unsupported envelope');
    const bytes = Buffer.from(item.envelope.slice(5), 'base64url');
    if (bytes.length < 76 || (bytes.length - 44) % 32 !== 0) throw new Error('invalid txe1 padded size');
    const keyId = bytes.subarray(0, 16).toString('hex');
    const aad = JSON.stringify(item.context);
    const digests = [];
    for (const row of input.keys) {
      if (row.keyId !== keyId || row.tenant !== item.context[0]) continue;
      for (const epoch of epochs) {
        if (epoch.tenant !== row.tenant || epoch.epoch !== row.epoch) continue;
        const key = tryOpen(epoch.value, row.wrapped, row.keyId);
        if (key?.length !== 32) continue;
        const plain = tryOpen(key, bytes.subarray(16).toString('base64'), aad);
        if (!plain) continue;
        // Fixture padding profile: uint32-LE length, value bytes, then zero fill.
        const length = plain.readUInt32LE();
        if (length > plain.length - 4 || plain.subarray(4 + length).some(byte => byte !== 0))
          throw new Error('invalid fixture padding');
        const fingerprint = createHash('sha256').update(plain.subarray(4, 4 + length)).digest('hex');
        if (fingerprint !== item.plainSha256) throw new Error('authenticated plaintext differs from expected bytes');
        digests.push(fingerprint);
      }
    }
    return { assertionId: item.context[3], opened: digests.length > 0, digests };
  });
  return { envelopes, issues };
}
if (process.argv[1] === undefined || process.argv[1] === '-') {
  let input = ''; for await (const chunk of process.stdin) input += chunk;
  try { process.stdout.write(JSON.stringify(decryptEvidence(JSON.parse(input)))); }
  catch (error) { process.stderr.write(String(error.message)); process.exitCode = 2; }
}
