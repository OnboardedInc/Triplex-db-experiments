import assert from "node:assert/strict";
import test from "node:test";
import { FairTurns } from "./fair-turns.ts";

function fixture(credits) {
  const turns = new FairTurns(10, credits);
  const ready = [];
  const sent = [];
  const dispatch = () =>
    turns.dispatch(
      () => ready,
      (picked, turn) => {
        ready.splice(ready.indexOf(picked), 1);
        sent.push({ ...picked, turn });
      },
    );
  return { turns, ready, sent, dispatch };
}

for (const credits of [1, 6]) {
  test(`quiet save takes the next turn behind ${credits} neighbour credits`, () => {
    const { turns, ready, sent, dispatch } = fixture(credits);
    for (let i = 0; i < 3 * credits; i++) ready.push({ account: 1, due: i });
    dispatch();
    assert.equal(sent.length, credits);
    ready.push({ account: 0, due: 3 * credits });
    dispatch();
    for (let i = 0; i < credits - 1; i++) {
      turns.resolved(true);
      dispatch();
    }
    assert.equal(sent.length, credits, "a partial reply must leave this turn in flight");
    turns.resolved(true);
    dispatch();
    assert.equal(sent[credits].account, 0, "a second neighbour turn overtook the quiet account");
    assert.equal(sent[credits].turn, 2);
    assert(sent.slice(0, credits).every((save) => save.turn === 1));
    assert(sent.slice(credits).every((save) => save.turn === 2));
  });
}

test("under-share accounts take turns in ready order", () => {
  const { turns, ready, sent, dispatch } = fixture(1);
  ready.push({ account: 1, due: 1 }, { account: 1, due: 2 });
  dispatch();
  ready.push({ account: 0, due: 4 }, { account: 2, due: 3 });
  for (let i = 0; i < 3; i++) {
    turns.resolved(true);
    dispatch();
  }
  assert.deepEqual(
    sent.map((r) => [r.account, r.due]),
    [
      [1, 1],
      [2, 3],
      [0, 4],
      [1, 2],
    ],
  );
});

test("an uncertain outcome keeps the next turn closed", () => {
  const { turns, ready, sent, dispatch } = fixture(2);
  ready.push({ account: 1, due: 1 }, { account: 1, due: 2 });
  dispatch();
  ready.push({ account: 0, due: 3 });
  turns.resolved(false);
  turns.resolved(true);
  dispatch();
  assert.equal(sent.length, 2);
});
