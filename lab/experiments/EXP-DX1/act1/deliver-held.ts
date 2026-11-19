import { readFileSync } from "node:fs";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { parseOutbox } from "../../../bench/lib/w0-guarded.ts";
import { observe, open } from "./check.ts";

const request = parseOutbox(readFileSync(0, "utf8"));
const { scope, layout, nonce, record } = request;
const comp = await open(scope);
try {
  const before = await comp.currentPosition();
  await publishChanged(comp, [record], { layout });
  const after = await comp.currentPosition();
  console.log(
    JSON.stringify({
      scope,
      nonce,
      before,
      after,
      state: (await observe(comp, [record.subject], after))[0],
    }),
  );
} finally {
  await comp.close();
}
