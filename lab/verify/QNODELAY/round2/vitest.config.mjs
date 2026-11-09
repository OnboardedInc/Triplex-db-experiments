// [CX-VQNODELAY-R2] Why: run the exact response tests without installing unrelated workspace dependencies.
// Rejected: altering tests or resolving a different Undici version to make them pass.
export default {
  resolve: { alias: {
    undici: '/Users/sam/projects/triplex-db-2/node_modules/.pnpm/undici@7.29.1/node_modules/undici/index.js',
    vitest: '/Users/sam/projects/triplex-db-2/node_modules/vitest/dist/index.js',
  } },
  test: { include: ['packages/qlever/test/client-parity.test.ts', 'packages/qlever/test/client-connection.test.ts', 'lab/experiments/EXP-QNODELAY/round2/receipts.test.ts'], maxWorkers: 1, fileParallelism: false, testTimeout: 30000, cache: false },
};
