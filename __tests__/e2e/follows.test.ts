import { test, expect } from "@playwright/test";
import type { Page, Browser } from "@playwright/test";
import { registerAs } from "./helpers";

test.describe.configure({ mode: "serial" });

const TARGET_USERNAME = "frankg";

let page: Page;

function profileActions(p: Page) {
  return p.getByTestId("profile-actions");
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext();
  page = await context.newPage();

  // Fresh user guaranteed to follow nobody
  const ts = Date.now();
  await registerAs(page, {
    name: "E2E Tester",
    username: `e2e_${ts}`,
    email: `e2e_${ts}@test.com`,
    password: "TestTest#",
  });
});

test.afterAll(async () => {
  await page.close();
});

test.describe("Follow / Unfollow", () => {
  test("can follow a user and count increments", async () => {
    await page.goto(`/${TARGET_USERNAME}`);
    const followersLink = page.getByRole("link", { name: /Followers/ });
    const before = parseInt((await followersLink.textContent())!.match(/\d+/)![0]);

    await profileActions(page).getByRole("button", { name: "Follow" }).click();
    await page.mouse.move(0, 0);
    await expect(profileActions(page).getByRole("button", { name: "Following" })).toBeVisible();

    await expect(followersLink).toContainText(String(before + 1));
  });

  test("can unfollow a user", async () => {
    await page.goto(`/${TARGET_USERNAME}`);
    const actions = profileActions(page);
    await actions.getByRole("button", { name: "Following" }).click();
    await page.mouse.move(0, 0);
    await expect(actions.getByRole("button", { name: "Follow" })).toBeVisible();
  });
});
