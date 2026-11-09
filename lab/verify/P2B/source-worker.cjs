// [CX-VP2B] Why: pause an actual reader snapshot after its marker read while the broker commits and purges. Rejected: sleeps that do not prove the overlap.
const { parentPort, workerData } = require('node:worker_threads');
require(workerData.tsx);
const { BrokerReadService } = require(workerData.source);
const service = new BrokerReadService(workerData.file, workerData.watermark);
const gate = new Int32Array(workerData.gate);
const db = service.db;
const prepare = db.prepare.bind(db);
let pause = false;
db.prepare = sql => {
  const stmt = prepare(sql);
  if (!sql.startsWith('SELECT lsn,epoch')) return stmt;
  const get = stmt.get.bind(stmt);
  stmt.get = (...args) => {
    const result = get(...args);
    if (pause) {
      pause = false;
      Atomics.store(gate, 0, 1);
      Atomics.notify(gate, 0);
      if (Atomics.wait(gate, 1, 0, 20000) === 'timed-out') throw Error('Reader overlap gate timed out');
    }
    return result;
  };
  return stmt;
};
parentPort.on('message', async ({id, op, basis, selection, hold}) => {
  try {
    if (op === 'close') { service.close(); parentPort.postMessage({id, closed:true}); return; }
    if (op === 'head') { parentPort.postMessage({id, result:service.watermark.read()}); return; }
    pause = !!hold;
    const result = await service.pullAt(basis, selection ?? {});
    parentPort.postMessage({id, result});
  } catch (error) { parentPort.postMessage({id, error:String(error)}); }
});
parentPort.postMessage({ready:true});
