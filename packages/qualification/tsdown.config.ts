import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "esnext",
  fixedExtension: false,
  dts: false,
  unbundle: true,
  sourcemap: true,
  clean: false,
  outDir: "dist",
});
