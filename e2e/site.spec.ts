import AxeBuilder from "@axe-core/playwright";
import { fixtures } from "./fixtures";
import { expect, test, tokyoStation } from "./support";

test("APIのメンテナンス中（503）は、知らせて、探すボタンを止める", async ({ page, api }) => {
  api.on("options", () => ({ status: 503, json: { message: "Service Unavailable" } }));
  await page.goto("/");

  await expect(page.getByRole("status").filter({ hasText: "メンテナンス中" })).toBeVisible();
  await expect(page.getByRole("button", { name: "📍 現在地から探す" })).toBeDisabled();
});

/** Each page, and what shows once its data has arrived. */
const pages = [
  { name: "トップ", path: "/", ready: "📍 現在地から探す" },
  {
    name: "検索結果",
    path: `/?lat=${tokyoStation.latitude}&lng=${tokyoStation.longitude}&place=東京駅`,
    ready: fixtures.nearby.data[0].name.replace(/\u3000/g, " "),
  },
  { name: "施設詳細", path: `/facility/?id=${fixtures.facility.data.id}`, ready: "今日" },
];

for (const colorScheme of ["light", "dark"] as const) {
  for (const { name, path, ready } of pages) {
    test(`${name}に、重大なアクセシビリティの問題がない（${colorScheme === "light" ? "ライト" : "ダーク"}モード）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      // Scan the page with its data, not its loading state.
      await expect(page.getByText(ready, { exact: true }).filter({ visible: true }).first()).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      expect(serious.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
    });
  }
}
