import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// [CX-VER01S] Why: independently construct a new usable wrapper of the same assertion key.
// Rejected: copying the old wrapped bytes (only tests the observer's known-byte search).
let text = '';
for await (const chunk of process.stdin) text += chunk;
const input = JSON.parse(text);
function open(key, encoded, aad) {
  const box = Buffer.from(encoded, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', key, box.subarray(0, 12));
  cipher.setAAD(Buffer.from(aad));
  cipher.setAuthTag(box.subarray(-16));
  return Buffer.concat([cipher.update(box.subarray(12, -16)), cipher.final()]);
}
const epoch = open(Buffer.from(input.root, 'hex'), input.epoch.wrapped,
  JSON.stringify([input.epoch.tenant, input.epoch.epoch]));
const key = open(epoch, input.key.wrapped, input.key.keyId);
const nonce = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', epoch, nonce);
cipher.setAAD(Buffer.from(input.key.keyId));
const wrapped = Buffer.concat([nonce, cipher.update(key), cipher.final(), cipher.getAuthTag()]);
const newKey = open(epoch, wrapped.toString('base64'), input.key.keyId);
const envelope = Buffer.from(input.envelope.envelope.slice(5), 'base64url');
const plain = open(newKey, envelope.subarray(16).toString('base64'), JSON.stringify(input.envelope.context));
const length = plain.readUInt32LE();
if (length > plain.length - 4 || plain.subarray(4 + length).some(byte => byte !== 0))
  throw new Error('invalid padding');
const digest = createHash('sha256').update(plain.subarray(4, 4 + length)).digest('hex');
if (digest !== input.envelope.plainSha256) throw new Error('independent decryption differs');
process.stdout.write(JSON.stringify({ row: { ...input.key, wrapped: wrapped.toString('base64') },
  independentlyOpenedSha256: digest }));
