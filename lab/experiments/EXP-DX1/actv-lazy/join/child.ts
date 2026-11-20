import { readFileSync } from "node:fs";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { Documents } from "../../notify1/store.ts";
const m = JSON.parse(readFileSync(0, "utf8")),
  s = await openStore(m.scope),
  a = new JoinedAccount(s);
const stop = () => {
  process.kill(process.pid, "SIGKILL");
};
try {
  if (m.stop === "receiver") {
    const sink = await openStore(m.sink);
    try {
      await a
        .dispatcher(new Documents(sink.comp, "sink"))
        .drain({ afterReceive: async () => stop() });
    } finally {
      await sink.close();
    }
  } else {
    await a.publish(
      m.id,
      m.doc,
      m.at,
      m.storage,
      m.stop === "before" ? async () => stop() : undefined,
    );
    stop();
  }
} finally {
  await s.close();
}
