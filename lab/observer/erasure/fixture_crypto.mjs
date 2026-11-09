import { createCipheriv, createHash, randomBytes } from 'node:crypto';

// [EXP-ER01-S] Why: independent, random positive-control material exercises the read-only decryptor.
// Rejected: product KeyVault code (not built, and would let the SUT certify its own deletion).
const root = randomBytes(32), old = randomBytes(32), next = randomBytes(32);
const targetKey = randomBytes(32), liveKey = randomBytes(32);
function box(key, plaintext, aad) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad));
  return Buffer.concat([nonce, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}
function envelope(key, keyId, assertionId, plain) {
  const context = ['fixture-tenant', 'fixture-subject', 'protected.text', assertionId, 'string'];
  const value = Buffer.from(plain), padded = Buffer.alloc(Math.ceil((4 + value.length) / 32) * 32);
  padded.writeUInt32LE(value.length); value.copy(padded, 4);
  return { envelope: 'txe1.' + Buffer.concat([Buffer.from(keyId, 'hex'), box(key, padded, JSON.stringify(context))]).toString('base64url'),
    context, plainSha256: createHash('sha256').update(value).digest('hex') };
}
const targetId = randomBytes(16).toString('hex'), liveId = randomBytes(16).toString('hex');
const key = (keyId, epoch, material, kek) => ({ keyId, tenant: 'fixture-tenant', epoch, wrapped: box(kek, material, keyId).toString('base64') });
const epoch = (number, material) => ({ tenant: 'fixture-tenant', epoch: number,
  wrapped: box(root, material, JSON.stringify(['fixture-tenant', number])).toString('base64') });
const token = randomBytes(8).toString('hex');
const targetPlain = 'protected-' + token, twinPlain = 'unprotect-' + token;
const livePlain = 'live-data-' + randomBytes(8).toString('hex');
const keys = [key(targetId, 1, targetKey, old), key(targetId, 2, targetKey, next), key(liveId, 2, liveKey, next)];
process.stdout.write(JSON.stringify({ root: root.toString('hex'), targetPlain, twinPlain, keys, epochs: [epoch(1, old), epoch(2, next)],
  envelopes: [envelope(targetKey, targetId, 'erased-assertion', targetPlain),
              envelope(liveKey, liveId, 'live-assertion', livePlain)] }));
