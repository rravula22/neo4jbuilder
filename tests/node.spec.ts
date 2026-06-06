import { expect, test } from "@playwright/test";

test("generates node query", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Label", { exact: true }).fill("Person");
  await page.getByLabel("Properties (JSON object)").first().fill('{"name":"Alice"}');
  await page.getByRole("button", { name: "Generate Node Query" }).click();

  await expect(page.getByText("node query").first()).toBeVisible();
  await expect(page.getByText("CREATE (n:`Person`) SET n += $properties RETURN n")).toBeVisible();
  await expect(page.getByText('"name": "Alice"')).toBeVisible();
});
