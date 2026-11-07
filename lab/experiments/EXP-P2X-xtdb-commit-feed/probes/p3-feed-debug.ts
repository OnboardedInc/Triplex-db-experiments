// EXP-P2X probe 3: what the feed tailer sees after two subject-stamp commits.
// Run from packages/xtdb: XTDB_URL=... node --experimental-strip-types ../../lab/experiments/EXP-P2X-xtdb-commit-feed/probes/p3-feed-debug.ts
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { makeXtdbClient } from "../../../../packages/xtdb/dist/index.js";
import { makeXtdbStorageAdapter } from "../../../../packages/xtdb/dist/index.js";
import { makeXtdbCommitFeed } from "../../../../packages/xtdb/dist/index.js";

const client = makeXtdbClient(process.env["XTDB_URL"]!);
const scope = `p3:${randomUUID()}`;
const adapter = makeXtdbStorageAdapter(client, scope, { commitPath: "subject-stamp" });
await Effect.runPromise(adapter.initialize());
const feed = makeXtdbCommitFeed(client, scope);
const start = await feed.tip();
console.log("tip", start);
for (const entity of ["a", "b"])
  await Effect.runPromise(
    adapter.withTransaction(
      Effect.gen(function* () {
        const position = yield* adapter.nextCommitPosition();
        yield* adapter.insert({ entityId: entity as never, attribute: ":v", value: { type: "string", value: entity } }, "tx:x", 1, randomUUID(), position);
      }),
    ),
  );
const raw = await client.query("SELECT msg_id, msg_type FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ? LIMIT ?", [start.msgId, 2 ** 48 - 1, 10]);
console.log("raw records", raw);
const txs = await client.query("SELECT _id, committed, user_metadata FROM xt.txs ORDER BY _id DESC LIMIT 3");
console.log("txs", JSON.stringify(txs));
console.log("page", JSON.stringify(await feed.poll(start)));
await client.close();
