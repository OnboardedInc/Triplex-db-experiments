// [EXP-P2B-R4] Why: run the copied reviewer schedules in this builder worktree. Rejected: writing observations into the verifier's evidence directory.
export default {
  cache: false,
  test: {
    include: ["lab/verify/P2B/review.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
};
