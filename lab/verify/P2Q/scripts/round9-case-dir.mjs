// [CX-VP2Q-4-R9] Why: the legacy guard setup writes a readback before importing the harness that creates its output directory.
// Rejected: accepting its ENOENT as an unknown-code refusal (that failure never tests the catalog).
import fs from "node:fs";
if (!process.env.V_P2Q_OUT) throw new Error("missing fresh gate case directory");
fs.mkdirSync(process.env.V_P2Q_OUT, { recursive: true });
