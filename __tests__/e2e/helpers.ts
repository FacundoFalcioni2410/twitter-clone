import type { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  credentials: { email: string; password: string } = {
    email: "facundofalcioni2410@gmail.com",
    password: "TestTest#",
  }
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/home");
}

export async function registerAs(
  page: Page,
  user: { name: string; username: string; email: string; password: string }
) {
  await page.goto("/register");
  await page.getByLabel("Display name").fill(user.name);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/home");
}
