import { test, expect } from "@playwright/test";

test.describe.skip("Smoke @smoke", () => {
  test("home loads cleanly", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/(Luton|IMS|Dashboard|Home)/);
    expect(errors, `Console errors: ${errors.join("\n")}`).toHaveLength(0);
  });

  test.fixme("inventory dashboard renders", async ({ page }) => {
    await page.goto("/dashboard/inventory");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("data-table")).toBeVisible({ timeout: 15000 });
  });
});
