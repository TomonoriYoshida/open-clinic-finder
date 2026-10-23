import { fixtures } from "./fixtures";
import { expect, test } from "./support";

const facilityPath = `/facility/?id=${fixtures.facility.data.id}`;

test.describe("施設詳細", () => {
  test("名前・電話番号と、今日の診療時間を表示する", async ({ page }) => {
    await page.goto(facilityPath);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(fixtures.facility.data.name);
    await expect(page.getByRole("link", { name: new RegExp(fixtures.facility.data.phone_number!) })).toBeVisible();
    await expect(page.getByRole("heading", { name: "診療時間" })).toBeVisible();
    // On a phone, one line per day; 2026-10-05 is a Monday.
    const monday = page.locator("dl > div").filter({ hasText: "今日" });
    await expect(monday).toContainText("09:00–13:00 / 13:30–17:00");
  });

  test("医療情報ネットと照合できない施設は、その旨を表示する", async ({ page, api }) => {
    api.on("openingHours", () => ({ json: { ...fixtures.openingHours, data: null } }));
    await page.goto(facilityPath);

    await expect(page.getByText("診療時間が公開されていません。お電話でご確認ください。")).toBeVisible();
  });
});
