import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });
const testDbUrl = process.env.DATABASE_URL!.replace(/\/([^/?]+)(\?.*)?$/, "/$1_test$2");

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./__tests__/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalSetup: "./playwright.global-setup.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: {
      slowMo: 200,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(isCI
      ? [{ name: "Mobile Chrome", use: { ...devices["Pixel 5"] } }]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDbUrl,
    },
  },
});
