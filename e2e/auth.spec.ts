import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_EMAIL;
const TEST_PASSWORD = process.env.E2E_PASSWORD;

test.describe("Authentication flow", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Should stay on login page or show error
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page renders form fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create/i })).toBeVisible();
  });

  test("redirects authenticated users away from login", async ({ page, context }) => {
    // Skip unless both credentials are configured
    test.skip(
      !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
      "E2E credentials not set — skipping auth test"
    );

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_EMAIL!);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
