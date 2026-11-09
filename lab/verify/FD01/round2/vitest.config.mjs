import fs from 'node:fs';
const { subject } = JSON.parse(fs.readFileSync(new URL('./subject.json', import.meta.url)));
// [CX-VFD01-R2] Why: run exact reviewed tests against the copied source; dependencies are read-only.
// Rejected: installing a second dependency tree while disk is near the admission threshold.
export default { root: subject, cacheDir: subject + '/.vite', resolve: { alias: [
  { find: /^vitest$/, replacement: '/Users/sam/projects/triplex-db-2/node_modules/vitest/dist/index.js' },
  ...[['triplex', 'core'], ['triplex-host', 'host'], ['triplex-testkit', 'testkit']].map(([name, pkg]) => ({
    find: new RegExp('^@triplex-build/' + name + '/feed$'), replacement: subject + '/packages/' + pkg + '/src/feed/index.ts',
  })),
] }, test: { environment: 'node', include: ['packages/host/test/feed/feed.test.ts'] } };
