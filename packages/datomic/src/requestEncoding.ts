import { setImmediate as yieldTurn } from "node:timers/promises";
import { isPlainJsonData, stringifyExact } from "./codec.js";
import { traceSync } from "./tracing.js";
import { isProxy } from "node:util/types";

// [DX-T1-12] Why: detect owned large row/ID bodies without invoking user getters during a second traversal.
// Rejected: stringify once just to measure size (the blocking work would already have happened).
export function largeRequestBody(body: unknown): boolean {
  if (typeof body !== "object" || body === null)
    return typeof body === "string" && body.length > 512 * 1024;
  if (isProxy(body)) return false;
  for (const key of ["rowOrder", "rows", "ids"]) {
    const d = Object.getOwnPropertyDescriptor(body, key);
    if (d && "value" in d && !isProxy(d.value) && Array.isArray(d.value) && d.value.length >= 512)
      return true;
  }
  const texts = Object.getOwnPropertyDescriptor(body, "rowTexts");
  if (
    !texts ||
    !("value" in texts) ||
    !texts.value ||
    typeof texts.value !== "object" ||
    isProxy(texts.value)
  )
    return false;
  let length = 0;
  for (const key of Object.keys(texts.value)) {
    const d = Object.getOwnPropertyDescriptor(texts.value, key);
    if (!d || !("value" in d) || typeof d.value !== "string") return false;
    length += key.length + d.value.length;
    if (length > 512 * 1024) return true;
  }
  return false;
}

export async function encodeLargeRequest(body: unknown): Promise<string> {
  // [DX-T1-12] Why: capture plain data synchronously before the first yield, preserving the call's original values and signed zero.
  // Rejected: let a caller mutate a transaction while chunk encoding is suspended, or clone objects with accessors/proxies/toJSON.
  const snapshot = traceSync("client.encode.snapshot", () =>
    isPlainJsonData(body, true) ? { value: structuredClone(body) } : null,
  );
  if (!snapshot) return stringifyExact(body);
  type Task = { value: unknown } | { token: string };
  const stack: Task[] = [{ value: snapshot.value }],
    chunks: string[] = [];
  let steps = 0;
  const string = async (value: string) => {
    if (value.length <= 32768) {
      chunks.push(JSON.stringify(value));
      return;
    }
    chunks.push('"');
    for (let start = 0; start < value.length; ) {
      let end = Math.min(value.length, start + 32768);
      if (
        end < value.length &&
        value.charCodeAt(end - 1) >= 0xd800 &&
        value.charCodeAt(end - 1) <= 0xdbff &&
        value.charCodeAt(end) >= 0xdc00 &&
        value.charCodeAt(end) <= 0xdfff
      )
        end++;
      chunks.push(JSON.stringify(value.slice(start, end)).slice(1, -1));
      start = end;
      await yieldTurn();
    }
    chunks.push('"');
  };
  while (stack.length) {
    const task = stack.pop()!;
    if ("token" in task) chunks.push(task.token);
    else {
      const v = task.value;
      if (typeof v === "string") {
        if (v.length <= 32768) chunks.push(JSON.stringify(v));
        else await string(v);
      } else if (v === null || typeof v !== "object") chunks.push(stringifyExact(v));
      else if (Array.isArray(v)) {
        chunks.push("[");
        stack.push({ token: "]" });
        for (let i = v.length - 1; i >= 0; i--) {
          stack.push({ value: v[i] });
          if (i) stack.push({ token: "," });
        }
      } else {
        chunks.push("{");
        stack.push({ token: "}" });
        const entries = Object.entries(v);
        for (let i = entries.length - 1; i >= 0; i--) {
          const [k, x] = entries[i]!;
          stack.push({ value: x }, { token: ":" }, { value: k });
          if (i) stack.push({ token: "," });
        }
      }
    }
    if (++steps % 256 === 0) await yieldTurn();
  }
  return traceSync("client.encode.join", () => chunks.join(""));
}
