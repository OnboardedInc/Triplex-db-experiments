import assert from "node:assert/strict";

type Offer = { offered: number; ingress: number; cutoff: number; mode: "owed" | "staged" };
type Read = { started: number; headObserved: number; finished: number; basis: { tx: number } };
type Raw = {
  entered: number;
  durable: number;
  nativeCut: number;
  first: Read;
  deadline: Read;
  coldDeadline: Read;
};

export function timings(o: Offer, r: Raw) {
  const { offered, ingress, cutoff } = o;
  const { entered, durable, nativeCut, first, deadline, coldDeadline } = r;
  assert(
    [
      offered,
      ingress,
      cutoff,
      entered,
      durable,
      first.started,
      first.headObserved,
      first.finished,
      deadline.started,
      deadline.headObserved,
      deadline.finished,
      coldDeadline.started,
      coldDeadline.headObserved,
      coldDeadline.finished,
    ].every(Number.isFinite),
  );
  assert(
    cutoff === ingress + 1000 && ingress >= offered - 2 && entered >= ingress && durable >= entered,
  );
  assert(
    first.started >= durable && first.finished >= first.started && first.basis.tx >= nativeCut,
  );
  assert([deadline, coldDeadline].every((r) => r.started >= cutoff - 2 && r.finished >= r.started));
  assert(
    [first, deadline, coldDeadline].every(
      (r) => r.started <= r.headObserved && r.headObserved <= r.finished,
    ),
  );
  return {
    offeredToDurableMs: durable - offered,
    ingressToDurableMs: durable - ingress,
    firstCorrectMs: first.finished - offered,
    ingressToFirstCorrectMs: first.finished - ingress,
    noticeRecipeDurableMs: durable - offered,
    changedValuesDurableMs: o.mode === "staged" ? durable - offered : null,
    individualOwedDurableMs: null,
    deadlineMiss:
      first.finished > cutoff ||
      durable > cutoff ||
      [deadline, coldDeadline].some(
        (read) =>
          read.started > cutoff + 10 ||
          read.headObserved > cutoff + 50 ||
          read.basis.tx < nativeCut,
      ),
  };
}

export function verifyTimings(o: Offer, r: Raw & ReturnType<typeof timings>) {
  for (const [k, expected] of Object.entries(timings(o, r)))
    assert.equal(r[k as keyof typeof r], expected, "Inconsistent observation " + k);
}
