import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { expect, it } from "vitest";
import { protectWrite } from "../src/protectedWrite.js";

it("seals the exact request and authenticates its scope and attempt", () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
  const clear = JSON.stringify({ operationId: "op", attemptId: "try", value: "test-marker\ud800" });
  const wire = protectWrite(publicKey, "scope-one", "op", "try", clear);
  expect(wire).not.toContain("test-marker");
  const { key, body, nonce } = JSON.parse(wire).protectedWrite;
  const secret = privateDecrypt(
    { key: keys.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(key, "base64"),
  );
  const sealed = Buffer.from(body, "base64");
  const read = (scope: string, attempt: string) => {
    const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(nonce, "base64"));
    decipher.setAAD(Buffer.from(JSON.stringify(["triplex-write-v1", scope, "op", attempt])));
    decipher.setAuthTag(sealed.subarray(-16));
    return Buffer.concat([decipher.update(sealed.subarray(0, -16)), decipher.final()]).toString();
  };
  expect(read("scope-one", "try")).toBe(clear);
  expect(() => read("scope-two", "try")).toThrow();
  expect(() => read("scope-one", "later")).toThrow();
});
