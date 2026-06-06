import { expect, test } from "@playwright/test";

test("generates node query", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Label").fill("Person");
  await page.getByLabel("Properties (JSON object)").first().fill('{"name":"Alice"}');
  await page.getByRole("button", { name: "Generate Node Query" }).click();

  await expect(page.getByText("node query").first()).toBeVisible();
  await expect(page.getByText("CREATE (n:`Person`) SET n += $properties RETURN n")).toBeVisible();
  await expect(page.getByText('"name": "Alice"')).toBeVisible();
});

test("shows relationship validation error", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Generate Relationship Query" }).click();
  await expect(page.getByText("From ID and To ID are required")).toBeVisible();
});

test("generates relationship query", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("From Node ID").fill("person-1");
  await page.getByLabel("To Node ID").fill("company-1");
  await page.getByLabel("from label (optional)").fill("Person");
  await page.getByLabel("to label (optional)").fill("Company");
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

test("creates queries using drag and drop builder options", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("builder-option-node-label-person").dragTo(page.getByTestId("node-drop-zone"));
  await page.getByTestId("builder-option-node-props-person").dragTo(page.getByTestId("node-drop-zone"));
  await page.getByRole("button", { name: "Generate Node Query" }).click();

  await page.getByTestId("builder-option-rel-from-id").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByTestId("builder-option-rel-to-id").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByTestId("builder-option-rel-from-label").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByTestId("builder-option-rel-to-label").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByTestId("builder-option-rel-type-works-at").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByTestId("builder-option-rel-props").dragTo(page.getByTestId("relationship-drop-zone"));
  await page.getByRole("button", { name: "Generate Relationship Query" }).click();

  await expect(page.getByText("node query").first()).toBeVisible();
  await expect(page.getByText("relationship query").first()).toBeVisible();
  await expect(page.getByText("CREATE (n:`Person`) SET n += $properties RETURN n")).toBeVisible();
  await expect(page.getByText("MATCH (from:`Person` { id: $fromId }), (to:`Company` { id: $toId })")).toBeVisible();
});
