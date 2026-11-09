import { createHash } from 'node:crypto';
import { nsP5Traffic, nsP1Ladder } from '../../bin/claim.mjs';
import { completeSegment as seg64, calibration } from '../../bin/test/ns-round2-fixture.mjs';
const H = s => createHash('sha256').update(s).digest('hex'), MS = 1_000_000n, t = String;
const mk = (id, s0, wms) => seg64({ id, level: 64, phase: 'steady', traceSegment: 'seg', offerScheduleSha256: H('s'), startNs: t(s0), endNs: t(s0 + 1_000_000_000n),
  offers: [{ commandId: 'x', scheduledAtNs: t(s0 + MS), sentAtNs: t(s0 + MS), ackAtNs: t(s0 + MS + BigInt(wms) * MS) }] });
const cal = calibration(4,'P5',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('s'),sweepOfferOffsetsNs:['1000000']});
console.log('V-O14 inflated', JSON.stringify(nsP5Traffic({ baseline: mk('b', 0n, 49), sweep: mk('d', 5_000_000_000n, 73) }, { startNs: t(5_000_000_000n), endNs: t(6_000_000_000n) }, () => H('correct'), [], cal)));
console.log('V-O14 honest  ', JSON.stringify(nsP5Traffic({ baseline: mk('b', 0n, 4), sweep: mk('d', 5_000_000_000n, 5) }, { startNs: t(5_000_000_000n), endNs: t(6_000_000_000n) }, () => H('correct'), [], cal)));
