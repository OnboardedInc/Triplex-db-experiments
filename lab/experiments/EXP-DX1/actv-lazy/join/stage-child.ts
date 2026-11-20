import { readFileSync } from "node:fs";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
const c = JSON.parse(readFileSync(0, "utf8"));
const s = await openStore(c.scope, "act2-deep"),
  a = new JoinedAccount(s);
const stop = async () => {
  process.kill(process.pid, "SIGKILL");
};
try {
  await a.publish(c.id, c.document, c.at, "staged", undefined, {
    ...c.options,
    afterChunk: c.stop === "chunk" ? stop : undefined,
  });
  if (c.stop === "receipt") await stop();
} finally {
  await s.close();
}
