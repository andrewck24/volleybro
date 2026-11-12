import { expect, test } from "@playwright/test";
import { required } from "./env";

test.describe.configure({ mode: "serial" });

test("@smoke session is valid", async ({ page }) => {
  const email = required("SMOKE_USER_EMAIL");

  await page.goto("/");
  const session = await page.evaluate(() =>
    fetch("/api/auth/get-session", { credentials: "include" }).then((r) =>
      r.json(),
    ),
  );
  expect(session?.user?.email).toBe(email);
});

test("@smoke serves a tab page on a hard load with no modal open", async ({
  page,
}) => {
  const response = await page.goto("/home");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/home$/);
});

test("@smoke test team read-only page", async ({ page }) => {
  const teamId = required("SMOKE_TEAM_ID");

  await page.goto(`/team/${teamId}`);
  const teamName = page.getByRole("heading", { level: 1 });
  await expect(teamName).toBeVisible();
  await expect(teamName).not.toHaveText(/^(Loading\.\.\.)?$/);
  await expect(
    page
      .getByRole("link")
      .and(
        page.locator(`[href^="/team/${teamId}/players/"]:not([href$="/new"])`),
      )
      .first(),
  ).toBeVisible();
});
