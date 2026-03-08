import { test, expect } from "@playwright/test";

// These tests require an authenticated session.
// Set E2E_EMAIL and E2E_PASSWORD env vars to run them.
test.describe("Trackers flow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
      "E2E credentials not set — skipping authenticated tests"
    );
    const email = process.env.E2E_EMAIL!;
    const password = process.env.E2E_PASSWORD!;
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("navigates to trackers list", async ({ page }) => {
    await page.goto("/trackers");
    await expect(page.getByRole("heading", { name: /trackers/i })).toBeVisible();
  });

  test("navigates to create tracker page", async ({ page }) => {
    await page.goto("/trackers/new");
    await expect(page.getByRole("heading", { name: /create/i })).toBeVisible();
  });

  test("creates a counter tracker", async ({ page }) => {
    await page.goto("/trackers/new");

    // Fill in tracker name
    await page.getByLabel(/name/i).fill("E2E Counter Tracker");

    // Select COUNTER type (may already be default or need to click)
    const counterOption = page.getByRole("button", { name: /counter/i });
    if (await counterOption.isVisible()) {
      await counterOption.click();
    }

    // Submit form
    await page.getByRole("button", { name: /create/i }).click();

    // Should redirect to tracker detail or list
    await expect(page).toHaveURL(/\/trackers/);
  });
});

test.describe("Trackers page (unauthenticated)", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/trackers");
    await expect(page).toHaveURL(/\/login/);
  });
});
