// [CX-VP2B] Why: disable caches so dependency reuse stays read-only. Rejected: writing through sibling node_modules.
export default {
  cache: false,
  test: {
    include: ['packages/broker/test/**/*.test.ts'],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
};
