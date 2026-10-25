import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    channel: process.env.PW_CHANNEL || "msedge",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
