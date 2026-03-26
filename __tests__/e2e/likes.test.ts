import { test, expect } from "@playwright/test";
import type { Page, Browser } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe.configure({ mode: "serial" });

let page: Page;
let likedTweetIdx: number;
let likedTweetCountBefore: number;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext();
  page = await context.newPage();
  await loginAs(page);
});

test.afterAll(async () => {
  await page.close();
});

/** Return the nth-index of the first article matching a button label. */
async function findArticleWith(label: "Like" | "Unlike"): Promise<number> {
  const articles = page.locator("article");
  const count = await articles.count();
  for (let i = 0; i < count; i++) {
    if (await articles.nth(i).getByRole("button", { name: label, exact: true }).count() > 0) {
      return i;
    }
  }
  throw new Error(`No article with "${label}" button found`);
}

test.describe("Like / Unlike", () => {
  test("can like a tweet and count increments", async () => {
    await page.goto("/home");

    likedTweetIdx = await findArticleWith("Like");
    const tweet = page.locator("article").nth(likedTweetIdx);

    likedTweetCountBefore = parseInt(
      (await tweet.locator("button.tabular-nums").textContent({ timeout: 500 }).catch(() => "0"))!
    );

    await tweet.getByRole("button", { name: "Like", exact: true }).click();
    await page.mouse.move(0, 0);
    await expect(tweet.getByRole("button", { name: "Unlike", exact: true })).toBeVisible();
    await expect(tweet.locator("button.tabular-nums")).toHaveText(String(likedTweetCountBefore + 1));
  });

  test("can unlike a tweet and count decrements", async () => {
    await page.goto("/home");

    // Unlike the exact tweet that was liked in the previous test
    const tweet = page.locator("article").nth(likedTweetIdx);

    await tweet.getByRole("button", { name: "Unlike", exact: true }).click();
    await page.mouse.move(0, 0);
    await expect(tweet.getByRole("button", { name: "Like", exact: true })).toBeVisible();

    if (likedTweetCountBefore > 0) {
      await expect(tweet.locator("button.tabular-nums")).toHaveText(String(likedTweetCountBefore));
    } else {
      await expect(tweet.locator("button.tabular-nums")).not.toBeVisible();
    }
  });

  test("clicking the like count shows who liked it", async () => {
    await page.goto("/home");

    const tweetWithLikes = page
      .locator("article")
      .filter({ has: page.locator("button.tabular-nums") })
      .first();
    await tweetWithLikes.locator("button.tabular-nums").click();

    await expect(page.getByText("Liked by")).toBeVisible();
    await expect(page.locator("[role='dialog'], .fixed").getByRole("link").first()).toBeVisible();

    await page.keyboard.press("Escape");
  });
});
