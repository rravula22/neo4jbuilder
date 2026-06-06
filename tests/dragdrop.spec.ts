import { expect, test } from "@playwright/test";

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
