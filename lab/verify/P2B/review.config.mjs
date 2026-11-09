// [CX-VP2B] Why: independent probes need isolated source transforms and no dependency cache writes. Rejected: inherited Vite aliases to sibling source.
export default { cache: false, test: { include: ['lab/verify/P2B/review.test.ts'], maxWorkers: 1, fileParallelism: false, testTimeout: 60000 } };
