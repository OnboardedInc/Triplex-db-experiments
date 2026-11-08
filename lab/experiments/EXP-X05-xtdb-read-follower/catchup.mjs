// EXP-X05: after a follower (re)start, wait until its latest completed tx equals the writer's; print timings.
import { connect, sleep } from './common.mjs';

const [t0, t1] = process.argv.slice(2).map(Number);
const latest = async url => {
  const c = connect(url);
  try { return Number((await c.unsafe('SHOW LATEST_COMPLETED_TXS'))[0]?.tx_id); } finally { await c.end({ timeout: 2 }); }
};
const writerTx = await latest('postgres://xtdb:xtdb@127.0.0.1:5472/xtdb');
const start = Date.now();
let followerTx = null;
while (Date.now() - start < 300_000) {
  try { followerTx = await latest('postgres://xtdb:xtdb@127.0.0.1:5482/xtdb'); } catch (error) { followerTx = `error ${error.code ?? error.message}`; }
  if (followerTx === writerTx) break;
  await sleep(250);
}
console.log(JSON.stringify({ readyAfterS: t1 - t0, caughtUpAfterReadyS: (Date.now() - start) / 1000, writerTx, followerTx, caughtUp: followerTx === writerTx }));
