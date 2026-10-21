import { expect, test } from "./fixtures";

const isMobile = (name: string) => name === "mobile-390";

test.describe("design: header, night skin and match tabs", () => {
  test("night skin toggles, persists across reloads and never breaks the page", async ({ page, consoleErrors }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "الوضع الليلي" });
    await expect(html).not.toHaveClass(/\bnight\b/);
    await toggle.click();
    await expect(html).toHaveClass(/\bnight\b/);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(html).toHaveClass(/\bnight\b/);
    await expect(page.getByRole("button", { name: "الوضع الليلي" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "الوضع الليلي" }).click();
    await expect(html).not.toHaveClass(/\bnight\b/);
    expect(await page.evaluate(() => localStorage.getItem("ys-skin"))).toBe("day");
    expect(consoleErrors).toEqual([]);
  });

  test("main menu: inline on desktop, drawer with Escape on mobile", async ({ page, consoleErrors }, info) => {
    await page.goto("/");
    const burger = page.getByRole("button", { name: "فتح القائمة" });
    const nav = page.locator("#ys-main-nav");
    if (!isMobile(info.project.name)) {
      await expect(burger).toBeHidden();
      await expect(nav.getByRole("link", { name: "البطولات" })).toBeVisible();
      return;
    }
    await expect(nav.getByRole("link", { name: "البطولات" })).toBeHidden();
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "البطولات" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toBeFocused();
    await burger.click();
    await nav.getByRole("link", { name: "البطولات" }).click();
    await expect(page).toHaveURL(/\/leagues$/);
    await expect(page.getByRole("button", { name: "فتح القائمة" })).toHaveAttribute("aria-expanded", "false");
    expect(consoleErrors).toEqual([]);
  });

  test("match tabs switch panels without JavaScript navigation", async ({ page, consoleErrors }) => {
    await page.goto("/matches/al-ahly-vs-zamalek-sc-900001");
    await expect(page.locator("#match-details")).toBeVisible();
    await expect(page.locator("#lineups")).toBeHidden();
    await page.locator('label[for="tab-lineups"]').click();
    await expect(page.locator("#lineups")).toBeVisible();
    await expect(page.locator("#match-details")).toBeHidden();
    await expect(page.locator("#lineups .ys-pitch .ys-player")).toHaveCount(22);
    await page.locator('label[for="tab-events"]').click();
    await expect(page.locator("#events")).toBeVisible();
    await expect(page.locator("#events .ys-event").first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
