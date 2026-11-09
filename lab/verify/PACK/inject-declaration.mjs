// [CX-VPACK] Why: corrupt emitted declarations after the real build, so the consumer
// checker is exercised. Rejected: a source type error (tests only the package compiler).
import { appendFileSync } from "node:fs";
appendFileSync(
  "dist/index.d.ts",
  "\nexport type CX_VPACK_BrokenDeclaration = CX_VPACK_MissingType;\n",
);
