import { createServer } from "node:http";
import fs from "node:fs";
import { it, expect } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";

// [EXP-DF01] Why: actual HTTP roundtrip checks the query and long-poll timeout plumbing offline.
// Rejected: replacing client.request (would bypass serialization and response validation).
it("reads the gateway log route and rejects foreign response binding", async () => {
  const page = JSON.parse(
    fs.readFileSync(
      new URL("../../../lab/experiments/EXP-DF01/recorded-page.json", import.meta.url),
      "utf8",
    ),
  );
  let foreign = false;
  const server = createServer((req, res) => {
    expect(req.url).toBe("/v1/db/s2-Zg/log?fromT=100&limit=3&waitMs=10");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ...page, database: foreign ? "other" : "s2-Zg" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const client = new DatomicClient(`http://127.0.0.1:${port}`);
  try {
    expect(await client.log("s2-Zg", "100", 3, 10)).toEqual(page);
    foreign = true;
    await expect(client.log("s2-Zg", "100", 3, 10)).rejects.toThrow("binding mismatch");
    for (const from of ["01", "-1", "9223372036854775808"])
      await expect(client.log("s2-Zg", from)).rejects.toThrow("Invalid");
  } finally {
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
