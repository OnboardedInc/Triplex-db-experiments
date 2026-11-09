// [CX-VRQ01] Why: resolve the pinned postgres module for XtdbClient's error type; no connection is created.
// Rejected: installing dependencies or replacing the offline client with a network client.
import { realpathSync } from 'node:fs';
import base from './lane-a4.config';
export default {
  ...base,
  resolve: { alias: [
    { find: /^postgres$/, replacement: realpathSync('/Users/sam/projects/triplex-db-2/packages/xtdb/node_modules/postgres/src/index.js') },
    ...base.resolve.alias,
  ] },
};
