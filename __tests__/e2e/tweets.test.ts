import { test, expect } from "@playwright/test";
import type { Page, Browser } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe.configure({ mode: "serial" });

let page: Page;
const createdTweets: string[] = [];

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext();
  page = await context.newPage();
  await loginAs(page);
});

test.afterAll(async () => {
  // Clean up any tweets left by tests
  await page.goto("/home");
  for (const content of createdTweets) {
    try {
      const article = page.locator("article").filter({ hasText: content });
      if (await article.isVisible({ timeout: 2000 })) {
        await article.getByLabel("Delete tweet").click();
      }
    } catch {
      // already deleted by the test itself
    }
  }
  await page.close();
});

test.beforeEach(async () => {
  await page.goto("/home");
});

const id = () => Date.now();

async function postTweet(content: string) {
  createdTweets.push(content);
  await page.getByPlaceholder("What's happening?").fill(content);
  await page.getByTestId("compose-post-btn").click();
  await expect(page.getByText(content)).toBeVisible();
}

test.describe("Tweets", () => {
  test("compose box is visible on home page", async () => {
    await expect(page.getByPlaceholder("What's happening?")).toBeVisible();
  });

  test("Post button is disabled when textarea is empty", async () => {
    await expect(page.getByTestId("compose-post-btn")).toBeDisabled();
  });

  test("Post button enables after typing", async () => {
    await page.getByPlaceholder("What's happening?").fill("Hello");
    await expect(page.getByTestId("compose-post-btn")).toBeEnabled();
  });

  test("character counter appears and turns red over limit", async () => {
    const textarea = page.getByPlaceholder("What's happening?");

    await textarea.fill("a".repeat(260));
    await expect(page.locator("span.tabular-nums")).toHaveClass(/text-yellow-500/);

    await textarea.fill("a".repeat(281));
    await expect(page.locator("span.tabular-nums")).toHaveClass(/text-red-500/);
    await expect(page.getByTestId("compose-post-btn")).toBeDisabled();
  });

  test("posts a tweet and it appears in the timeline", async () => {
    const content = `Just posted this from a test — checking it shows up [${id()}]`;
    await postTweet(content);
  });

  test("textarea clears after posting", async () => {
    const content = `Testing that the textarea resets after hitting Post [${id()}]`;
    await postTweet(content);
    await expect(page.getByPlaceholder("What's happening?")).toHaveValue("");
  });

  test("can delete own tweet", async () => {
    const content = `This tweet exists only to be deleted. Goodbye, cruel world [${id()}]`;
    await postTweet(content);

    await page
      .locator("article")
      .filter({ hasText: content })
      .getByLabel("Delete tweet")
      .click();

    await expect(page.getByText(content)).not.toBeVisible();
    // Remove from cleanup list since it's already gone
    createdTweets.splice(createdTweets.indexOf(content), 1);
  });

  test("posts a tweet from the sidebar modal", async () => {
    const content = `Posted via the sidebar modal — testing that flow works [${id()}]`;
    createdTweets.push(content);
    await page.getByRole("button", { name: "Post" }).first().click();
    await page.getByPlaceholder("What's happening?").last().fill(content);
    await page.getByTestId("compose-post-btn").last().click();
    await expect(page.getByText(content)).toBeVisible();
  });

  test("own tweets show a delete button, other users do not", async () => {
    const content = `My tweet — I should see a delete button on this one [${id()}]`;
    await postTweet(content);

    const ownArticle = page.locator("article").filter({ hasText: content });
    await expect(ownArticle.getByLabel("Delete tweet")).toBeVisible();

    const othersArticle = page.locator("article").filter({ hasText: "@alicej" }).first();
    await expect(othersArticle.getByLabel("Delete tweet")).not.toBeVisible();
  });
});
