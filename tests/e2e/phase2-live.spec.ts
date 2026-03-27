import { expect, test } from "@playwright/test";

function uniqueTag() {
  return Date.now().toString().slice(-6);
}

test.describe("Phase 2 - Live Local (SQLite/API)", () => {
  test.describe.configure({ mode: "serial" });

  test("live-api-health-check", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test("live-save-body-metric-persists", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Weight (lb)").fill("181.2");
    await page.getByLabel("Body Fat % (optional)").fill("16.4");
    await page.getByRole("button", { name: /Metric Profile/ }).click();

    await expect(page.getByText("Active metric: 181.2 lb")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Active metric: 181.2 lb")).toBeVisible();
    await expect(
      page.locator("section.stats article").filter({ hasText: "Current Weight" }).locator("strong")
    ).toHaveText("181.2 lb");
  });

  test("live-save-workout-persists", async ({ page }) => {
    const tag = uniqueTag();
    const note = `Live session ${tag}`;
    const exercise = `Bench ${tag}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Workout Log" }).click();
    await page.getByLabel("Session Notes (optional)").fill(note);

    const firstCard = page.locator(".exercise-card").first();
    await firstCard.getByLabel("Exercise Name").fill(exercise);
    const setRow = firstCard.locator(".set-row").nth(1);
    await setRow.locator("input").nth(0).fill("135");
    await setRow.locator("input").nth(1).fill("8");
    await page.getByRole("button", { name: "Save Workout Session" }).click();

    await expect(page.getByText(note)).toBeVisible();
    await page.reload();
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText("No workouts yet.")).toHaveCount(0);
  });

  test("calendar-persists-after-reload-live", async ({ page }) => {
    const tag = uniqueTag();
    const exercise = `Squat ${tag}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Workout Log" }).click();
    await page.locator(".exercise-card").first().getByLabel("Exercise Name").fill(exercise);
    await page.getByRole("button", { name: "Save Workout Session" }).click();

    await expect(page.locator(".calendar-cell.went")).toHaveCount(1);
    await page.reload();
    await expect(page.locator(".calendar-cell.went")).toHaveCount(1);
  });
});
