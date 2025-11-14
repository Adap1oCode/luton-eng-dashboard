import { test, expect } from "@playwright/test";

const ENTRY_ID = "test-entry";
const SAVE_ENDPOINT = "**/test-support/api/stock-adjustments/save";
const LOCATIONS_ENDPOINT = `**/api/stock-adjustments/${ENTRY_ID}/locations`;
const PATCH_ENDPOINT = `**/api/stock-adjustments/${ENTRY_ID}/actions/patch-scd2`;

test.describe("@smoke Stock Adjustment Edit Harness", () => {
  test("loads multi-location defaults with preloaded rows", async ({ page }) => {
    await page.goto("/test-support/stock-adjustments/edit?mode=multi");

    await expect(page.getByRole("heading", { name: "Stock Adjustment Edit Harness" })).toBeVisible();
    await expect(page.getByTestId("locations-row")).toHaveCount(2);
    await expect(page.getByTestId("locations-row").first()).toContainText("A1");
    await expect(page.getByTestId("locations-row").nth(1)).toContainText("A2");
    await expect(page.getByText("Total Qty: 11")).toBeVisible();
  });

  test("converts single-location entry to multi-location and syncs breakdown rows", async ({ page }) => {
    const requests: Array<{ type: string; body: any }> = [];

    await page.route(SAVE_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "save", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          row: { id: ENTRY_ID, multi_location: true, child_locations: body.locations ?? [] },
        }),
      });
    });

    await page.route(LOCATIONS_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "locations", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ locations: body.locations ?? [] }),
      });
    });

    await page.route(PATCH_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "patch", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ row: { id: ENTRY_ID, multi_location: true, child_locations: [] } }),
      });
    });

    await page.goto("/test-support/stock-adjustments/edit?mode=single");

    await page.getByLabel("Multi-location").click();
    await expect(page.getByTestId("locations-row")).toHaveCount(1);
    await expect(page.getByTestId("locations-row").first()).toContainText("A1");
    await expect(page.getByTestId("locations-row").first()).toContainText("4");

    await page.getByRole("button", { name: "Select location..." }).click();
    await page.getByRole("button", { name: "Aisle A2" }).click();
    await page.getByLabel("Quantity").fill("2");
    await page.getByRole("button", { name: "Add Location" }).click();

    await expect(page.getByTestId("locations-row")).toHaveCount(2);

    await page.getByRole("button", { name: "Save" }).click();

    await expect.poll(
      () => requests.filter((req) => req.type === "locations").length,
      { message: "locations sync request count" },
    ).toBe(1);

    const saveCall = requests.find((req) => req.type === "save");
    expect(saveCall?.body.multi_location).toBe(true);

    const locationsCall = requests.find((req) => req.type === "locations");
    expect(locationsCall?.body.locations).toEqual([
      { location: "A1", qty: 4, pos: 1 },
      { location: "A2", qty: 2, pos: 2 },
    ]);

    const patchCall = requests.find((req) => req.type === "patch");
    expect(patchCall?.body).toMatchObject({
      qty: 6,
      location: "A1, A2",
      multi_location: true,
    });
  });

  test("switches multi-location entry back to single-location and clears breakdown", async ({ page }) => {
    const requests: Array<{ type: string; body: any }> = [];

    await page.route(SAVE_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "save", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          row: { id: ENTRY_ID, multi_location: false, child_locations: [] },
        }),
      });
    });

    await page.route(LOCATIONS_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "locations", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ locations: [] }),
      });
    });

    await page.route(PATCH_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "patch", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ row: { id: ENTRY_ID, multi_location: false, child_locations: [] } }),
      });
    });

    await page.goto("/test-support/stock-adjustments/edit?mode=multi");

    await expect(page.getByTestId("locations-row")).toHaveCount(2);
    await page.getByLabel("Multi-location").click();
    await expect(page.getByTestId("locations-table")).not.toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();

    await expect.poll(
      () => requests.filter((req) => req.type === "locations").length,
      { message: "locations cleanup request count" },
    ).toBe(1);

    const locationsCall = requests.find((req) => req.type === "locations");
    expect(locationsCall?.body.locations).toEqual([]);
    expect(locationsCall?.body.previousEntryId).toBe(ENTRY_ID);

    const patchCall = requests.find((req) => req.type === "patch");
    expect(patchCall?.body).toMatchObject({
      multi_location: false,
    });
  });

  test("saves multi-location entry without changes without syncing locations", async ({ page }) => {
    const requests: Array<{ type: string; body: any }> = [];

    await page.route(SAVE_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "save", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          row: { id: ENTRY_ID, multi_location: true, child_locations: body.locations ?? [] },
        }),
      });
    });

    await page.route(LOCATIONS_ENDPOINT, async (route) => {
      requests.push({ type: "locations", body: JSON.parse(route.request().postData() ?? "{}") });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ locations: [] }),
      });
    });

    await page.route(PATCH_ENDPOINT, async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      requests.push({ type: "patch", body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ row: { id: ENTRY_ID, multi_location: true, child_locations: [] } }),
      });
    });

    await page.goto("/test-support/stock-adjustments/edit?mode=multi");
    await page.getByRole("button", { name: "Save" }).click();

    const locationSyncCount = requests.filter((req) => req.type === "locations").length;
    expect(locationSyncCount).toBe(0);

    const patchCall = requests.find((req) => req.type === "patch");
    expect(patchCall?.body).toMatchObject({
      multi_location: true,
      qty: 11,
      location: "A1, A2",
    });
  });
});






