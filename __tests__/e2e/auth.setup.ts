import { test as setup } from "@playwright/test";
import path from "path";
import { mkdir } from "fs/promises";

const AUTH_FILE = path.join(__dirname, "../../.playwright/auth/user.json");

setup("save authenticated session", async ({ page }) => {
  await mkdir(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill("facundofalcioni2410@gmail.com");
  await page.getByLabel("Password").fill("TestTest#");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/home");

  await page.context().storageState({ path: AUTH_FILE });
});
