import { constants, createCipheriv, publicEncrypt, randomBytes } from "node:crypto";

// [DX-W1] Why: the gateway's assertion keys protect storage while a pinned public key protects the request bytes.
// Rejected: relying on server-side sealing alone (the clear value would cross the request boundary).
export function protectWrite(
  publicKey: string,
  database: string,
  operationId: string,
  attemptId: string,
  clear: string | Buffer,
): string {
  const key = randomBytes(32);
  const nonce = randomBytes(12);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(
      Buffer.from(JSON.stringify(["triplex-write-v1", database, operationId, attemptId])),
    );
    const body = Buffer.concat([
      cipher.update(Buffer.from(clear)),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    const wrapped = publicEncrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
      key,
    );
    return JSON.stringify({
      operationId,
      attemptId,
      protectedWrite: {
        key: wrapped.toString("base64"),
        nonce: nonce.toString("base64"),
        body: body.toString("base64"),
      },
    });
  } finally {
    key.fill(0);
  }
}
