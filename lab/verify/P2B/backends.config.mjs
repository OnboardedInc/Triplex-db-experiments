// [CX-VP2B] Why: rerun only the reviewed offline backend paths against this worktree's broker build. Rejected: live integration suites in an offline review.
export default {cache:false,test:{include:[
'packages/xtdb/test/broker.test.ts','packages/xtdb/test/broker-route.test.ts','packages/xtdb/test/native-query.test.ts','packages/xtdb/test/query-compiler.test.ts',
'packages/qlever/test/broker.test.ts','packages/qlever/test/sqlite-broker.test.ts','packages/qlever/test/h1-route-equivalence.test.ts','packages/qlever/test/broker-fixes.test.ts','packages/qlever/test/broker-answer-errors.test.ts','packages/qlever/test/broker-request-errors.test.ts','packages/qlever/test/broker-transport-errors.test.ts'
],maxWorkers:1,fileParallelism:false,testTimeout:30000,hookTimeout:30000}};
