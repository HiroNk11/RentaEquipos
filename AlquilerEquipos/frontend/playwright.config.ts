import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command:
            "node node_modules/vite/bin/vite.js --port 5174 --strictPort",
          url: "http://127.0.0.1:5174",
          reuseExistingServer: !process.env.CI,
          env: { VITE_DEMO_MODE: "true", VITE_WINDOWS_LOCAL: "false" },
        },
        {
          command:
            "node node_modules/vite/bin/vite.js --port 5175 --strictPort",
          url: "http://127.0.0.1:5175",
          reuseExistingServer: !process.env.CI,
          env: {
            VITE_DEMO_MODE: "false",
            VITE_ALLOW_ANONYMOUS_API: "true",
            VITE_WINDOWS_LOCAL: "false",
          },
        },
        {
          command:
            "node node_modules/vite/bin/vite.js --port 5176 --strictPort",
          url: "http://127.0.0.1:5176",
          reuseExistingServer: !process.env.CI,
          env: {
            VITE_DEMO_MODE: "false",
            VITE_ALLOW_ANONYMOUS_API: "false",
            VITE_WINDOWS_LOCAL: "false",
            VITE_OIDC_AUTHORITY: "http://127.0.0.1:5176/oidc",
            VITE_OIDC_CLIENT_ID: "renta-test",
            VITE_OIDC_REDIRECT_URI: "http://127.0.0.1:5176/",
          },
        },
        {
          command:
            "node node_modules/vite/bin/vite.js --port 5177 --strictPort",
          url: "http://127.0.0.1:5177",
          reuseExistingServer: !process.env.CI,
          env: {
            VITE_DEMO_MODE: "false",
            VITE_WINDOWS_LOCAL: "true",
            VITE_ALLOW_ANONYMOUS_API: "false",
            VITE_OIDC_AUTHORITY: "",
            VITE_OIDC_CLIENT_ID: "",
          },
        },
      ],
  reporter: [["list"], ["html", { open: "never" }]],
});
