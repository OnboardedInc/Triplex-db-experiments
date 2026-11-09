// [EXP-NSR] Why: candidate bytes are R6 input; bound allocation, nesting, identities and time. Rejected: uncapped readline or candidate deserialization hooks.
import net from "node:net";
import { TextDecoder } from "node:util";
import { randomUUID } from "node:crypto";
export const REQUEST_CAP = 1024 * 1024;
export const RESPONSE_CAP = 16 * 1024 * 1024;
export const METHODS = Object.freeze({
  broker: ["commit", "feedPage"],
  readers: ["read", "pull"],
  consumer: ["consumerControl"],
});
export function validateJson(value, depth = 0) {
  if (depth > 64) throw Error("RPC nesting cap");
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value))
  )
    return;
  if (!value || typeof value !== "object") throw Error("RPC non-JSON value");
  for (const [k, v] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(k)) throw Error("RPC forbidden key");
    validateJson(v, depth + 1);
  }
}
const exact = (v, keys) =>
  v &&
  !Array.isArray(v) &&
  typeof v === "object" &&
  Object.keys(v).sort().join() === keys.sort().join();
export function validateMessage(v, response = false) {
  validateJson(v);
  if (
    v?.schema !== "ns-sut/1" ||
    typeof v.runId !== "string" ||
    !v.runId ||
    v.runId.length > 128 ||
    typeof v.id !== "string" ||
    !v.id ||
    v.id.length > 128
  )
    throw Error("RPC envelope");
  if (response) {
    if (v.ok === true && exact(v, ["schema", "runId", "id", "ok", "result"])) return v;
    if (
      v.ok === false &&
      exact(v, ["schema", "runId", "id", "ok", "error"]) &&
      exact(v.error, ["code", "message"]) &&
      v.error.code === "SUT-ERROR" &&
      typeof v.error.message === "string" &&
      v.error.message.length <= 1024
    )
      return v;
    throw Error("RPC response");
  }
  if (
    !exact(v, ["schema", "runId", "id", "method", "params"]) ||
    !Object.values(METHODS).flat().includes(v.method)
  )
    throw Error("RPC method");
  const fields = {
    commit: ["command"],
    read: ["request"],
    pull: ["request"],
    feedPage: ["cursor"],
    consumerControl: ["action", "data"],
  };
  if (!exact(v.params, fields[v.method])) throw Error("RPC params");
  if (
    v.method === "consumerControl" &&
    !["start", "step", "stop", "status", "hook", "release"].includes(v.params.action)
  )
    throw Error("RPC action");
  return v;
}
export function encode(v, cap) {
  validateJson(v);
  const bytes = Buffer.from(JSON.stringify(v) + "\n");
  if (bytes.length > cap) throw Error("RPC byte cap");
  return bytes;
}
export function lineReceiver(socket, cap, receive, fail) {
  let chunks = [],
    size = 0,
    failed = false;
  const refuse = (error) => {
    if (failed) return;
    failed = true;
    chunks = [];
    fail(error);
  };
  socket.on("data", (bytes) => {
    if (failed) return;
    size += bytes.length;
    if (size > cap) return refuse(Error("RPC byte cap"));
    chunks.push(bytes);
  });
  // [EXP-NSR] Why: a valid first line must not execute before a fragmented trailing line arrives. Rejected: dispatching as soon as LF appears.
  socket.on("end", () => {
    if (failed) return;
    try {
      const all = Buffer.concat(chunks);
      chunks = [];
      if (!all.length || all.at(-1) !== 10) throw Error("RPC truncated line");
      if (all.indexOf(10) !== all.length - 1) throw Error("RPC trailing bytes");
      const value = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(all.subarray(0, -1)),
      );
      receive(value, all);
    } catch (error) {
      refuse(error);
    }
  });
}

export function rpc(endpoint, runId, method, params, timeoutMs = 10000, observe) {
  const request = validateMessage({ schema: "ns-sut/1", runId, id: randomUUID(), method, params });
  const bytes = encode(request, REQUEST_CAP);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(endpoint);
    let done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(Error("RPC timeout")), timeoutMs);
    socket.on("error", (error) => finish(error));
    socket.on("connect", () => socket.end(bytes));
    lineReceiver(
      socket,
      RESPONSE_CAP,
      (v, raw) => {
        try {
          validateMessage(v, true);
          if (v.id !== request.id || v.runId !== runId) throw Error("RPC binding");
          if (!v.ok) throw Error(`RPC ${v.error.code}: ${v.error.message}`);
          observe?.(raw);
          finish(null, v.result);
        } catch (e) {
          finish(e);
        }
      },
      (error) => finish(error),
    );
    socket.on("close", () => {
      if (!done) finish(Error("RPC closed"));
    });
  });
}
