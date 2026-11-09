// [CX-VRQ01] Why: discover a source-derived negative probe without adding a permanent failing test.
// Rejected: the standard test suffix (would pollute the repository's ordinary test discovery).
import { fileURLToPath } from 'node:url';
const mode = process.env.VRQ01_GUARD;
if (!['original', 'repair'].includes(mode)) throw new Error('VRQ01_GUARD required');
export default {
  cacheDir: fileURLToPath(new URL('./cache/vite', import.meta.url)),
  resolve: { alias: [{ find: '@triplex-build/triplex/content', replacement: fileURLToPath(new URL('./content-shim.mjs', import.meta.url)) }] },
  test: { include: [`lab/verify/RQ01/guard-${mode}/case.probe.ts`], fileParallelism: false },
};
