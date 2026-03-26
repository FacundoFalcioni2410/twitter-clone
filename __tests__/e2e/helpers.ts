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
