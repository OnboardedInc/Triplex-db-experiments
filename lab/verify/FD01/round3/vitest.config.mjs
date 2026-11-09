import fs from 'node:fs';
const {subject}=JSON.parse(fs.readFileSync(new URL('./subject.json',import.meta.url)));
// [CX-VFD01-R3] Why: review immutable target source, including clock tests, without changing a checkout.
// Rejected: mutable builder dist or a second installed dependency tree.
export default {root:subject,cacheDir:subject+'/.vite',resolve:{alias:[
  {find:/^vitest$/,replacement:'/Users/sam/projects/triplex-db-2/node_modules/vitest/dist/index.js'},
  ...[['triplex','core'],['triplex-host','host'],['triplex-testkit','testkit']].map(([name,pkg])=>({find:new RegExp('^@triplex-build/'+name+'/feed$'),replacement:subject+'/packages/'+pkg+'/src/feed/index.ts'})),
]},test:{environment:'node',include:['packages/host/test/feed/*.test.ts']}};
