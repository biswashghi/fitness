import { expect, test } from "@playwright/test";

test.describe("Phase 2 - Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile-dashboard-layout-iphone", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Workout Log" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gym Calendar" })).toBeVisible();

    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(noOverflow).toBeTruthy();
  });

  test("mobile-workout-entry-flow", async ({ page }) => {
    const note = `Mobile flow ${Date.now().toString().slice(-6)}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Workout Log" }).click();
    await page.getByLabel("Session Notes (optional)").fill(note);

    const firstCard = page.locator(".exercise-card").first();
    await firstCard.getByLabel("Exercise Name").fill("DB Press");
    const firstRow = firstCard.locator(".set-row").nth(1);
    await firstRow.locator("input").nth(0).fill("55");
    await firstRow.locator("input").nth(1).fill("12");

    await page.getByRole("button", { name: "Save Workout Session" }).click();
    await expect(page.getByText(note)).toBeVisible();
  });
});
