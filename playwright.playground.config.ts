import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";

const { webServer: _unneededServers, ...playwright } = base;
const baseURL = process.env["PLAYGROUND_TEST_URL"];
export default defineConfig({
  ...playwright,
  testMatch: "playground-datomic.spec.ts",
  workers: 1,
  timeout: 90_000,
  use: { ...base.use, ...(baseURL ? { baseURL } : {}) },
});
