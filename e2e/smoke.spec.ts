import { expect, test } from "@playwright/test";

/** Keep in sync with `E2E_SKIP_BATTLE_PREP_KEY` in `src/shared/battlePrep.ts`. */
const E2E_SKIP_BATTLE_PREP = "dust-and-steel-e2e-skip-prep";

test("skips splash when arriving from webring portal", async ({ page }) => {
  await page.goto("/?portal=true&era=modern&ref=example.com");
  await expect(page.getByTestId("battle-screen")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="splash-screen"]')).toHaveCount(0);
});

test("loads and starts a battle from setup flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("splash-screen")).toBeVisible();
  await page.getByRole("button", { name: "Single player" }).click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page.getByRole("button", { name: "Crusades" }).click();
  await page.getByRole("button", { name: "Start Battle" }).click();
  await expect(page.getByTestId("battle-screen")).toBeVisible();
  await expect(page.getByTestId("battle-canvas")).toBeVisible();
});

test("can finish a battle via simulation fast-forward", async ({ page }) => {
  await page.addInitScript((key: string) => {
    localStorage.setItem(key, "1");
  }, E2E_SKIP_BATTLE_PREP);
  await page.goto("/");
  await page.getByRole("button", { name: "Single player" }).click();
  await page.getByRole("button", { name: "Modern Conflict" }).click();
  await page.getByRole("button", { name: "Start Battle" }).click();
  await expect(page.getByTestId("battle-canvas")).toBeVisible();
  await page.waitForFunction(
    () => typeof (window as Window & { __DUST_STEEL_E2E__?: unknown }).__DUST_STEEL_E2E__ !== "undefined"
  );
  await page.evaluate(() => {
    const hook = (window as Window & { __DUST_STEEL_E2E__: { fastForward: (s: number) => void } }).__DUST_STEEL_E2E__;
    hook.fastForward(300);
  });
  await expect(page.getByTestId("summary-screen")).toBeVisible();
});
