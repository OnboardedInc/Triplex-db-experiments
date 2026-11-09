import { defineConfig } from 'vitest/config';
export default defineConfig({resolve:{alias:[{find:/^@triplex-build\/triplex$/,replacement:"/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-a01-0314/runs/verify-A01-0314-round3/historical/packages/core/src/index.ts"}]},test:{root:import.meta.dirname,include:['memory-fixture.test.ts'],maxWorkers:1,fileParallelism:false,testTimeout:5000}});
