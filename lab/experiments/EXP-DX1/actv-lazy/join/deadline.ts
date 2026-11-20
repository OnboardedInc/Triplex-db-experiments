import assert from "node:assert/strict";
import { W0 } from "../../../../bench/lib/w0-world.ts";
import { millis } from "../store.ts";
import type { JoinedAccount } from "./account.ts";

type Alarm = (waitMs: number, wake: () => void) => () => void;
const setAlarm: Alarm = (ms, fn) => {
  const timer = setTimeout(fn, Math.max(1, Math.ceil(ms)));
  return () => clearTimeout(timer);
};

// [DX-ACT1] Why: restart derives the next real boundary from the durable account calendar. Rejected: read-triggered expiry or polling idle accounts.
export function deadlines(
  a: JoinedAccount,
  now = () => new Date().toISOString().replace("Z", "000Z"),
  alarm: Alarm = setAlarm,
) {
  let cancel: (() => void) | undefined,
    work: Promise<void> | undefined,
    dirty = false,
    closed = false,
    failure: unknown;
  const wake = () => {
    if (closed || failure) return;
    dirty = true;
    if (work) return;
    work = Promise.resolve()
      .then(async () => {
        while (dirty && !closed) {
          dirty = false;
          cancel?.();
          cancel = undefined;
          const instant = now();
          assert(W0.isInstant(instant));
          await a.advance(instant);
          const due = (await a.db.get<string[]>("join-calendar", await a.s.head())).value[0];
          if (due && !closed) {
            const remaining = millis(due) - millis(now());
            if (remaining <= 0) dirty = true;
            else cancel = alarm(Math.min(2147483647, remaining), wake);
          }
        }
      })
      .catch((e) => {
        failure = e;
      })
      .finally(() => {
        work = undefined;
        if (dirty && !closed && !failure) wake();
      });
  };
  const detach = a.onCalendar(wake);
  wake();
  const settled = async () => {
    while (work) await work;
    if (failure) throw failure;
  };
  return {
    wake,
    settled,
    close: async () => {
      closed = true;
      detach();
      cancel?.();
      await settled();
    },
  };
}
