import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "mkdir -p .tmp && rm -f .tmp/e2e.db && DB_PATH=.tmp/e2e.db node server/index.js",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: "npm run dev:web",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
});
