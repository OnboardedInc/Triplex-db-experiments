// [CX-VRQ01] Why: resolve the harness's sole runtime dependency to its unchanged implementation.
// Rejected: mocking SHA-256 (unnecessary); loading unrelated core exports (requires installation).
export * as Sha256 from '../../../packages/core/src/content/Sha256.ts';
