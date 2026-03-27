import { expect, test, type Page, type Route } from "@playwright/test";

type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
};

type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  date: string;
  notes: string;
  exercises: WorkoutExercise[];
};

type BodyMetricProfile = {
  effectiveFrom: string;
  updatedAt: string;
  weight: number;
  bodyFat?: number;
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function setupApiMocks(page: Page) {
  const sessions: WorkoutSession[] = [];
  let bodyMetric: BodyMetricProfile | null = null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/workout-sessions" && method === "GET") {
      await json(route, 200, sessions);
      return;
    }

    if (pathname === "/api/workout-sessions" && method === "POST") {
      const payload = request.postDataJSON() as WorkoutSession;
      sessions.unshift(payload);
      sessions.sort((a, b) => b.date.localeCompare(a.date));
      await json(route, 201, payload);
      return;
    }

    if (pathname === "/api/body-metric" && method === "GET") {
      await json(route, 200, bodyMetric);
      return;
    }

    if (pathname === "/api/body-metric" && method === "PUT") {
      const payload = request.postDataJSON() as Omit<BodyMetricProfile, "updatedAt">;
      bodyMetric = {
        ...payload,
        updatedAt: "2026-03-26T00:00:00.000Z"
      };
      await json(route, 200, bodyMetric);
      return;
    }

    if (pathname === "/api/exercise-library" && method === "GET") {
      const names = Array.from(
        new Set(
          sessions
            .flatMap((session) => session.exercises.map((exercise) => exercise.name.trim()))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      await json(route, 200, names);
      return;
    }

    if (pathname === "/api/health" && method === "GET") {
      await json(route, 200, { ok: true });
      return;
    }

    await json(route, 404, { error: `Unhandled route: ${method} ${pathname}` });
  });
}

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
});

test("loads dashboard with empty state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fitness Tracker" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gym Calendar" })).toBeVisible();
  await expect(page.getByText("No workouts yet.")).toBeVisible();
});

test("saves body metric profile and shows active metric", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Weight (lb)").fill("182.4");
  await page.getByLabel("Body Fat % (optional)").fill("17.9");
  await page.getByRole("button", { name: "Set Metric Profile" }).click();

  await expect(page.getByText("Active metric: 182.4 lb")).toBeVisible();
  await expect(page.locator("section.stats article").filter({ hasText: "Current Weight" }).locator("strong")).toHaveText(
    "182.4 lb"
  );
});

test("adds detailed workout session with unique exercises and set details", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Workout Log" }).click();
  await page.getByLabel("Session Notes (optional)").fill("Push + squat day");

  const firstCard = page.locator(".exercise-card").first();
  await firstCard.getByLabel("Exercise Name").fill("Bench Press");

  const firstSetRow = firstCard.locator(".set-row").nth(1);
  await firstSetRow.locator("input").nth(0).fill("135");
  await firstSetRow.locator("input").nth(1).fill("8");

  await firstCard.getByRole("button", { name: "+ Add Set" }).click();
  const secondSetRow = firstCard.locator(".set-row").nth(2);
  await secondSetRow.locator("input").nth(0).fill("145");
  await secondSetRow.locator("input").nth(1).fill("6");

  await page.getByRole("button", { name: "+ Add Exercise" }).click();
  const secondCard = page.locator(".exercise-card").nth(1);
  await secondCard.getByLabel("Exercise Name").fill("Back Squat");
  const secondCardSet = secondCard.locator(".set-row").nth(1);
  await secondCardSet.locator("input").nth(0).fill("225");
  await secondCardSet.locator("input").nth(1).fill("5");

  await page.getByRole("button", { name: "Save Workout Session" }).click();

  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("section.stats article").filter({ hasText: "Workouts" }).locator("strong")).toHaveText("1");
  await expect(page.locator("section.stats article").filter({ hasText: "Exercises" }).locator("strong")).toHaveText("2");
  await expect(page.locator("section.stats article").filter({ hasText: "Sets" }).locator("strong")).toHaveText("3");
  await expect(page.getByText("Push + squat day")).toBeVisible();
  await expect(page.locator(".calendar-cell.went")).toHaveCount(1);
});

test("shows validation error when exercise names are duplicated", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout Log" }).click();

  const firstCard = page.locator(".exercise-card").first();
  await firstCard.getByLabel("Exercise Name").fill("Bench Press");

  await page.getByRole("button", { name: "+ Add Exercise" }).click();
  const secondCard = page.locator(".exercise-card").nth(1);
  await secondCard.getByLabel("Exercise Name").fill("Bench Press");

  await page.getByRole("button", { name: "Save Workout Session" }).click();
  await expect(page.getByText("Each exercise should be unique within a workout.")).toBeVisible();
});

test("shows validation error for invalid set values", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout Log" }).click();

  const firstCard = page.locator(".exercise-card").first();
  await firstCard.getByLabel("Exercise Name").fill("Row");
  const firstSetRow = firstCard.locator(".set-row").nth(1);
  await firstSetRow.locator("input").nth(0).fill("-1");
  await firstSetRow.locator("input").nth(1).fill("0");

  await page.getByRole("button", { name: "Save Workout Session" }).click();
  await expect(page.getByText("Every set needs valid reps (>0) and weight (>=0).")).toBeVisible();
});
