import { expect, test } from "@playwright/test";

test.skip(!process.env["PLAYGROUND_TEST_URL"], "Run the pool-admitted Datomic playground gate");

test("read, compare, update, replay and publish in the Datomic playground", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore the fact store" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/\d+ records/);
  await expect(page.locator("#records")).toContainText(":person/name");
  await page.getByRole("button", { name: "Compare earlier" }).click();
  await expect(page.getByRole("heading", { name: "Changes since earlier cut" })).toBeVisible();
  await page.getByRole("button", { name: "Start live feed" }).click();
  await expect(page.locator("#feed-status")).toContainText("Live");
  await page.getByLabel("Note").fill("Browser trial");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Receipt");
  await expect(page.locator("#records")).toContainText("Browser trial");
  await expect(page.locator("#feed-rows")).toContainText("playground-save:");
  await page.getByRole("button", { name: "Try stale save" }).click();
  await expect(page.getByRole("status")).toContainText("StaleSave");
  await page.getByRole("button", { name: "Send twice" }).click();
  await expect(page.getByRole("status")).toContainText("Two submissions, one transaction");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("#progress")).toContainText("complete", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Materialized release answer" })).toBeVisible();
  await expect(page.locator("#feed-rows")).toContainText("publish:", { timeout: 10_000 });
  await page.getByText("Request and reply JSON", { exact: true }).click();
  await expect(page.locator("#reply-json")).toContainText("receipt");
  await expect(page.getByRole("button", { name: "Erase protected value" })).toBeDisabled();
  await page.getByRole("button", { name: "Person names" }).click();
  await page.getByRole("button", { name: "Run query" }).click();
  await expect(page.locator("#records")).toContainText("Vexari");
});
