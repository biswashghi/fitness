import { expect, test } from "@playwright/test";

test.describe("Phase 2 - PWA and Security Surface", () => {
  test("pwa-manifest-and-sw-available", async ({ request, page }) => {
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.ok()).toBeTruthy();
    const manifest = await manifestRes.json();
    expect(manifest.name).toContain("Fitness");
    expect(manifest.display).toBe("standalone");

    const swRes = await request.get("/sw.js");
    expect(swRes.ok()).toBeTruthy();
    const swText = await swRes.text();
    expect(swText).toContain("CACHE_NAME");

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const hasServiceWorker = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(registration);
    });
    expect(hasServiceWorker).toBeTruthy();
  });

  test("offline-shell-smoke", async ({ context, page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return;
      await navigator.serviceWorker.ready;
    });

    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Fitness Tracker" })).toBeVisible();
    await context.setOffline(false);
  });

  test("security-surface-smoke", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);

    const unknown = await request.get("/api/admin");
    expect(unknown.status()).toBeGreaterThanOrEqual(400);

    const badPayload = await request.post("/api/workout-sessions", { data: {} });
    expect(badPayload.status()).toBe(400);
  });
});
