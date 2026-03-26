import { test, expect } from "@playwright/test";

const uniqueUser = () => {
  const id = Date.now().toString().slice(-8); // 8 digits keeps username under 20 chars
  return {
    name: "Test User",
    username: `user${id}`,       // 4 + 8 = 12 chars
    email: `user${id}@example.com`,
    password: "Password1!",
  };
};

async function registerUser(page: import("@playwright/test").Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto("/register");
  await page.getByLabel("Display name").fill(user.name);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL("/home");
}

test.describe("Register", () => {
  test("successful registration redirects to /home", async ({ page }) => {
    await registerUser(page, uniqueUser());
  });

  test("shows error for duplicate email", async ({ page, context }) => {
    const user = uniqueUser();
    await registerUser(page, user);

    // Clear session so we can visit /register again
    await context.clearCookies();
    await page.goto("/register");

    await page.getByLabel("Display name").fill("Other User");
    await page.getByLabel("Username").fill(`other${Date.now()}`);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText("Email is already taken")).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("shows error for password shorter than 8 characters", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/register");

    await page.getByLabel("Display name").fill(user.name);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("Aa1!abc"); // 7 chars — fails Zod min(8)
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("shows error for weak password", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/register");

    await page.getByLabel("Display name").fill(user.name);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email").fill(user.email);
    // Passes minLength(8) but fails Zod (no uppercase, no special char)
    await page.getByLabel("Password").fill("weakpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/uppercase/i)).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("preserves form values on error", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/register");

    await page.getByLabel("Display name").fill(user.name);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email").fill(user.email);
    // Passes minLength(8) but fails server-side validation
    await page.getByLabel("Password").fill("weakpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/uppercase/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(user.email);
    await expect(page.getByLabel("Username")).toHaveValue(user.username);
  });
});

test.describe("Login", () => {
  const user = {
    name: "Login Tester",
    username: "logintester",
    email: "logintester@example.com",
    password: "Password1!",
  };

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/register");
    // If user already exists the register will fail — that's fine, we just need them in the DB
    await page.getByLabel("Display name").fill(user.name);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: /create account/i }).click();
    await context.close();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("successful login redirects to /home", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/home");
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("WrongPass1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("shows error for non-existent email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("preserves form values on error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("WrongPass1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByLabel("Email")).toHaveValue(user.email);
  });
});
