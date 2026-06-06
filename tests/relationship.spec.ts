import { expect, test } from "@playwright/test";

test("shows relationship validation error", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Generate Relationship Query" }).click();
  await expect(page.getByText("From ID and To ID are required")).toBeVisible();
});

test("generates relationship query", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("From Node ID").fill("person-1");
  await page.getByLabel("To Node ID").fill("company-1");
  await page.getByLabel("From label (optional)").fill("Person");
  await page.getByLabel("To label (optional)").fill("Company");
  await page.getByLabel("Type").fill("WORKS_AT");
  await page.getByLabel("Properties (JSON object)").nth(1).fill('{"since":2020}');
  await page.getByRole("button", { name: "Generate Relationship Query" }).click();

  await expect(page.getByText("relationship query").first()).toBeVisible();
  await expect(
    page.getByText(
      "MATCH (from:`Person` { id: $fromId }), (to:`Company` { id: $toId }) CREATE (from)-[r:`WORKS_AT`]->(to) SET r += $properties RETURN r"
    )
  ).toBeVisible();
  await expect(page.getByText('"fromId": "person-1"')).toBeVisible();
});
