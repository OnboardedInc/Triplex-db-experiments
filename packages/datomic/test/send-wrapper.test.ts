import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
// [DX-B5-L0] Why: real HTTP must signal send completion before ACK through the lab's older wrapper arities.
// Rejected: a fixture that forwards the new callback argument and therefore cannot expose the integration defect.
it("keeps socket-send ordering through two-argument transact and four-argument request wrappers", async () => {
  let observed!: () => void, acknowledge: (() => void) | undefined;
  const received = new Promise<void>((resolve) => {
    observed = resolve;
  });
  let wire: any;
  const server = createServer((req, res) => {
    const bytes: Buffer[] = [];
    req.on("data", (chunk) => bytes.push(chunk));
    req.on("end", () => {
      wire = JSON.parse(Buffer.concat(bytes).toString());
      acknowledge = () => {
        if (res.writableEnded) return;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({ t: { t: "long", v: "1" }, position: { t: "long", v: "1" }, delta: 0 }),
        );
      };
      observed();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const client = new DatomicClient(`http://127.0.0.1:${(server.address() as any).port}`);
  const transact = client.transact.bind(client),
    request = client.request.bind(client);
  client.transact = (db, input) => transact(db, input);
  client.request = (method, path, body, timeout) => request(method, path, body, timeout);
  let sent = false;
  const result = client.transact("fixture", {
    sourceK: 0,
    position: 1,
    operationId: "op",
    attemptId: "attempt",
    rows: [],
    newIds: [],
    claims: [],
    onSent: () => {
      sent = true;
    },
  });
  try {
    await received;
    expect(sent).toBe(true);
    expect(wire).not.toHaveProperty("onSent");
    acknowledge!();
    await result;
  } finally {
    acknowledge?.();
    await result.catch(() => {});
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
