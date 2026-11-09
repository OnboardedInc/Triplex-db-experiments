// @ts-nocheck -- [EXP-CHECKJS-R2] Node supports URL objects for dynamic import; the static overload expects a string. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from "node:assert/strict";
import { observer } from "./trace-session.mjs";
const original = new URL(import.meta.url).searchParams.get("original");
assert(original?.startsWith("file:") && original.includes("/postgres@3.4.9/"));
const driver = await import(original);
export default observer.wrapFactory(driver.default);
