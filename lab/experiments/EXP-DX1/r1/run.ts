import { runW0Driver } from "../../../bench/w0-driver.ts";
if (process.argv.includes("--corpus")) await import("./corpus-run.ts");
else await runW0Driver(process.argv.slice(2));
