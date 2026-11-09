// [CX-VP2B-R2] Why: run only offline receipt/resource regressions on local candidate source. Rejected: importing a sibling's product source or enabling engine tests.
export default {cache:false,test:{include:['packages/broker/test/**/*.test.ts','lab/verify/P2B/round2/*.test.ts'],maxWorkers:1,fileParallelism:false,testTimeout:60000,hookTimeout:30000}};
