import { defineConfig, devices } from "@playwright/test";

const sessionCookie = /better-auth\.session_token$/;

function sessionState() {
  try {
    const { cookies } = JSON.parse(process.env.SMOKE_STORAGE_STATE ?? "");
    return {
      cookies: cookies
        .filter((c: { name: string }) => sessionCookie.test(c.name))
        .map((c: object) => ({ ...c, expires: -1 })),
      origins: [],
    };
  } catch {
    return { cookies: [], origins: [] };
  }
}

export default defineConfig({
  testDir: "test/e2e",
  testMatch: "*.e2e.ts",
  retries: 1,
  reporter: [["list"], ["json"]],
  use: {
    baseURL: `https://${process.env.PRODUCTION_ALIAS}`,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "oauth",
      testMatch: "oauth.e2e.ts",
      use: { storageState: { cookies: [], origins: [] } },
    },
    {
      name: "chromium",
      testMatch: "session.e2e.ts",
      use: { ...devices["Desktop Chrome"], storageState: sessionState() },
    },
    {
      name: "webkit",
      testMatch: "session.e2e.ts",
      use: { ...devices["Desktop Safari"], storageState: sessionState() },
    },
  ],
});
