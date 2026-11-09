// [EXP-NSR] Why: the candidate entry owns runtime loading; the evaluator never imports a provider. Rejected: candidate packages executing in the HR driver process.
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import {
  METHODS,
  REQUEST_CAP,
  RESPONSE_CAP,
  encode,
  lineReceiver,
  validateMessage,
} from "../../../lab/bench/ns-driver/rpc.mjs";
export async function serveNS(role, config) {
  if (!METHODS[role] || !config.runId) throw Error("Invalid NS role/config");
  if (role === "broker") {
    const req = createRequire(new URL("../../host/package.json", import.meta.url));
    const { assertDurableFlush } = req("@triplex-build/triplex-host/feed");
    if (!config.storeFile) throw Error("Broker durable store path required");
    assertDurableFlush(config.storeFile);
  }
  const provider = await import(pathToFileURL(path.resolve(config.provider)).href);
  const api = await provider.openNsRole(role, config);
  const sockets = new Set();
  const server = net.createServer({ allowHalfOpen: true }, (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.setTimeout(config.timeoutMs ?? 10000, () => socket.destroy());
    socket.on("error", () => {});
    let started = false;
    lineReceiver(
      socket,
      REQUEST_CAP,
      async (message) => {
        try {
          validateMessage(message);
          if (message.runId !== config.runId || !METHODS[role].includes(message.method))
            throw Error("RPC role/run binding");
          if (started) throw Error("RPC repeated request");
          started = true;
          const result = await api[message.method](message.params);
          socket.end(
            encode(
              { schema: "ns-sut/1", runId: config.runId, id: message.id, ok: true, result },
              RESPONSE_CAP,
            ),
          );
        } catch (e) {
          try {
            socket.end(
              encode(
                {
                  schema: "ns-sut/1",
                  runId: config.runId,
                  id: message?.id ?? "invalid",
                  ok: false,
                  error: { code: "SUT-ERROR", message: String(e.message).slice(0, 1024) },
                },
                RESPONSE_CAP,
              ),
            );
          } catch {
            socket.destroy();
          }
        }
      },
      () => socket.destroy(),
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port ?? 0, config.host ?? "127.0.0.1", resolve);
  });
  return {
    endpoint: server.address(),
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((resolve) => server.close(resolve));
      await api.close?.();
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const args = process.argv.slice(2),
    role = args[args.indexOf("--role") + 1],
    file = args[args.indexOf("--config") + 1];
  serveNS(role, JSON.parse(fs.readFileSync(file, "utf8")))
    .then((service) => {
      console.log(
        JSON.stringify({ schema: "ns-sut/1", event: "ready", role, endpoint: service.endpoint }),
      );
      let closing = false;
      for (const signal of ["SIGINT", "SIGTERM"])
        process.on(signal, () => {
          if (closing) return;
          closing = true;
          service.close().then(
            () => process.exit(0),
            (e) => {
              console.error(e);
              process.exit(1);
            },
          );
        });
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}
