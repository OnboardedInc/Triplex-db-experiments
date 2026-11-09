// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-PACK] Why: corrupt emitted declarations after the real build, so the consumer
// checker is exercised. Rejected: a source type error (tests only the package compiler).
import { appendFileSync } from "node:fs";
appendFileSync(
  "dist/index.d.ts",
  "\nexport type CX_VPACK_BrokenDeclaration = CX_VPACK_MissingType;\n",
);
