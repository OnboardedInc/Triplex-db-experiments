// [EXP-P2B-R4] Why: the long-lived pin belongs to a worker connection, while every query releases its native statement.
// Rejected: a main-thread read pretending to exercise independent reader lifetime.
import { parentPort, workerData } from "node:worker_threads";
const { BrokerReadService, snapshotRows } = await import(workerData.module);
const service = new BrokerReadService(workerData.file, workerData.watermark);
parentPort.on("message", async ({ id, op, basis }) => {
  try {
    if (op === "close") {
      service.close();
      parentPort.postMessage({ id, result: { closed: true } });
      return;
    }
    const pull = await service.pullAt(basis, { entities: ["subject"] });
    parentPort.postMessage({
      id,
      result: {
        ...pull,
        rows: snapshotRows(pull.rows, basis),
        inTransaction: service.db.inTransaction,
      },
    });
  } catch (error) {
    parentPort.postMessage({ id, error: { reason: error.reason, message: String(error) } });
  }
});
parentPort.postMessage({ ready: true });
