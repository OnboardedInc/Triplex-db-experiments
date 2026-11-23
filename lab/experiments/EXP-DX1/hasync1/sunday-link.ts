import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import net, { type Socket } from "node:net";
import { once } from "node:events";

export const echoPort = 28489;
const bulkBytes = 32 * 1024 ** 2;

export async function echo(host: string) {
  const peers = new Set<Socket>();
  const server = net.createServer((peer) => {
    peers.add(peer);
    peer.setNoDelay(true);
    peer.setTimeout(30000, () => peer.destroy());
    peer.on("error", () => peer.destroy());
    peer.once("close", () => peers.delete(peer));
    peer.pipe(peer);
  });
  server.listen(echoPort, host);
  await once(server, "listening");
  return async () => {
    for (const peer of peers) peer.destroy();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  };
}

export async function roundTrips(host: string) {
  const socket = net.createConnection({ port: echoPort, host });
  socket.setNoDelay(true);
  socket.setTimeout(20000, () => socket.destroy(new Error("Link probe timed out")));
  try {
    await once(socket, "connect");
    const chunks = socket.iterator({ destroyOnReturn: false });
    async function exchange(sent: Buffer) {
      socket.write(sent);
      const digest = createHash("sha256");
      let size = 0;
      while (size < sent.length) {
        const next = await chunks.next();
        assert(!next.done, "Link probe ended prematurely");
        size += next.value.length;
        digest.update(next.value);
      }
      assert.equal(size, sent.length);
      const expected = createHash("sha256").update(sent).digest("hex");
      assert.equal(digest.digest("hex"), expected, "Altered link probe");
      return expected;
    }
    const times: number[] = [];
    for (let i = 0; i < 136; i++) {
      const bytes = randomBytes(32);
      const before = performance.now();
      await exchange(bytes);
      if (i >= 8) times.push(performance.now() - before);
    }
    times.sort((a, b) => a - b);
    const bulk = randomBytes(bulkBytes);
    const start = performance.now();
    const bulkSha256 = await exchange(bulk);
    const bulkMs = performance.now() - start;
    return {
      p50Ms: times[63]!,
      p95Ms: times[121]!,
      bulkBytes,
      bulkMs,
      bulkSha256,
      echoMiBps: 32000 / bulkMs,
    };
  } finally {
    socket.destroy();
  }
}
