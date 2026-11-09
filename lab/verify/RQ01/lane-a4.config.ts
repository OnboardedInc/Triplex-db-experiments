// [CX-VRQ01] Why: use the already installed lockfile-pinned ulidx dependency without writing node_modules.
// Rejected: installing dependencies or importing any sibling worktree's project code.
import { realpathSync } from 'node:fs';
import base from './lane.config';
export default {
  ...base,
  resolve: { alias: [
    { find: /^ulidx$/, replacement: realpathSync('/Users/sam/projects/triplex-db-2/packages/core/node_modules/ulidx/dist/node/index.js') },
    ...base.resolve.alias,
  ] },
};
