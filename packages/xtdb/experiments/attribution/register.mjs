/** Run only via an explicitly pinned diagnostic --import; product bytes stay intact. */
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./trace-session.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const xtdbBuild = path.join(root, "packages/xtdb/dist") + path.sep;
// The pinned synchronous hook runs in this process before the real entry point.
// Keep the original module URL and wrap ONLY XTDB's existing default postgres
// import. This does not substitute a runtime, compiler, transport or query DSL.
// Node24.13 labels registerHooks active-development: this is an isolated tool.
// https://nodejs.org/download/release/v24.13.0/docs/api/module.html#moduleregisterhooksoptions
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier !== "postgres" || !context.parentURL?.startsWith("file:"))
      return nextResolve(specifier, context);
    if (!fileURLToPath(context.parentURL).startsWith(xtdbBuild))
      return nextResolve(specifier, context);
    const original = nextResolve(specifier, context);
    assert(
      original.url.includes("/postgres@3.4.9/"),
      "Driver observation requires the exact pinned postgres3.4.9 package",
    );
    const wrapper = new URL("./driver-wrapper.mjs", import.meta.url);
    wrapper.searchParams.set("original", original.url);
    return { ...original, url: wrapper.href, format: "module", shortCircuit: true };
  },
});
