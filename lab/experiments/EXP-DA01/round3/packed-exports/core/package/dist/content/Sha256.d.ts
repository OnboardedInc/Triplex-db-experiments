declare namespace Sha256_d_exports {
  export { hex };
}
/**
 * SHA-256, with no dependency on Node.
 *
 * `ContentId` previously imported `node:crypto`, which makes this package
 * unusable in a browser. That matters because the configuration kernel is meant
 * to decode and validate the same declarations on the server, in the browser
 * builder, in the CLI and in tests - a kernel that only runs on Node forces a
 * second implementation for the authoring surface, and two implementations of a
 * content hash is precisely the thing this whole design cannot survive.
 *
 * `crypto.subtle.digest` is the obvious browser answer and is rejected here for
 * one reason: it is asynchronous. `TypeExpr.id`, `ConfigNode.diff` and the
 * canonical encoders are synchronous by design, and making identity async would
 * push a Promise into every comparison in the system to avoid one dependency.
 *
 * So the algorithm is written out. It is ~60 lines of well-specified arithmetic
 * with a total test oracle available - `Sha256.test.ts` compares it against
 * `node:crypto` over random and adversarial inputs, so a transcription error
 * cannot survive a test run. That is a better trade than a supply-chain
 * dependency in the one function every identity in the store rests on.
 */
/** Lowercase hex SHA-256 of a string, encoded as UTF-8. */
declare const hex: (input: string) => string;
//#endregion
export { Sha256_d_exports, hex };
//# sourceMappingURL=Sha256.d.ts.map