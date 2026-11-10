import { Histogram } from './hist.ts';
// [DX-H4] Why: preserve offer-to-ACK latency while exposing apparatus cost.
// Rejected: subtracting client time from the latency used by any bar.
export function commitBreakdown(rows: any[]) {
  const segments = {
    beforeTransact: (w: any) => w.transactCalledAt - w.scheduledAt,
    transact: (w: any) => w.transactReturnedAt - w.transactCalledAt,
    afterTransact: (w: any) => w.ackPublishedAt - w.transactReturnedAt,
    afterAck: (w: any) => w.finishedAt - w.ackPublishedAt,
    publicationWitness: (w: any) => w.publicationDurableAt - w.publicationStartedAt,
    driverOwn: (w: any) => w.transactCalledAt - w.scheduledAt + w.finishedAt - w.transactReturnedAt + (Number.isFinite(w.publicationDurableAt) ? w.publicationDurableAt - w.publicationStartedAt : 0),
  };
  return Object.fromEntries(Object.entries(segments).map(([name, value]) => {
    const h = new Histogram();
    for (const row of rows) { const ms = value(row); if (Number.isFinite(ms) && ms >= 0) h.recordMs(ms); }
    return [name, h.summary()];
  }));
}
