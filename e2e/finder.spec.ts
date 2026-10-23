import { copy, fixtures } from "./fixtures";
import { allowLocation, expect, test, tokyoStation } from "./support";

/** "1,043件": the count line shows the API's total. */
const nearbyCount = `${fixtures.nearby.meta.total.toLocaleString("ja-JP")}件`;

/** "11:30まで" for a facility of the nearby fixture (all close on the day searched). */
function openUntilLabel(name: string): string {
  const openUntil = fixtures.nearby.data.find((facility) => facility.name === name)!.open_until!;
  return `${Number(openUntil.slice(11, 13))}:${openUntil.slice(14, 16)}まで`;
}

test.describe("トップ（場所を選ぶ前）", () => {
  test("現在地か駅名・住所で探すように案内し、まだ施設を探さない", async ({ page, api }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("近くでいま開いている病院・薬局を探す");
    await expect(page.getByRole("button", { name: "📍 現在地から探す" })).toBeVisible();
    await expect(page.getByLabel("駅名・住所で探す")).toBeVisible();
    expect(api.requestsTo("/api/v1/medical-facilities")).toEqual([]);
  });

  test("現在地を許可すると、いま開いている近くの施設を探す", async ({ page, context, api }) => {
    await allowLocation(context);
    await page.goto("/");
    await page.getByRole("button", { name: "📍 現在地から探す" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("📍 現在地の近く");
    await expect(page.getByText(nearbyCount)).toBeVisible();
    // Accessible names fold the full-width spaces of the names into plain ones.
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      fixtures.nearby.data.map((facility) => facility.name.replace(/\u3000/g, " ")),
    );

    const query = api.requestsTo("/api/v1/medical-facilities").at(-1)!.searchParams;
    // The clock is fixed at Monday 2026-10-05 10:30 in Japan.
    expect(query.get("open_at")).toBe("2026-10-05T10:30");
    expect(query.get("radius")).toBe("2000");
    expect(query.get("status")).toBe("1");
    expect(Number(query.get("latitude"))).toBeCloseTo(tokyoStation.latitude, 3);
    expect(Number(query.get("longitude"))).toBeCloseTo(tokyoStation.longitude, 3);
  });

  test("現在地を許可しないと、駅名・住所で探すように知らせる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "📍 現在地から探す" }).click();

    // Next.js keeps an empty role="alert" route announcer outside main.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("位置情報の利用が許可されていません。駅名や住所で探してください。");
  });

  test("駅名で探した候補から選ぶと、その場所の近くを探す", async ({ page, api }) => {
    await page.goto("/");
    await page.getByLabel("駅名・住所で探す").fill("新宿駅");
    await page.getByLabel("駅名・住所で探す").press("Enter");

    await page.getByRole("button", { name: /^新宿駅/ }).first().click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("📍 新宿駅の近く");
    expect(api.requestsTo("/address-search/AddressSearch")[0].searchParams.get("q")).toBe("新宿駅");
    await expect(page).toHaveURL(/[?&]place=%E6%96%B0%E5%AE%BF%E9%A7%85/);
  });
});

test.describe("検索結果", () => {
  const resultsPath = `/?lat=${tokyoStation.latitude}&lng=${tokyoStation.longitude}&place=東京駅`;

  test("施設ごとに、何時まで開いているかを表示する", async ({ page }) => {
    await page.goto(resultsPath);

    for (const { name } of fixtures.nearby.data) {
      await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText(openUntilLabel(name));
    }
  });

  test("見つからないときは、範囲を広げるか時間で絞らずに探せる", async ({ page, api }) => {
    const empty = copy(fixtures.nearby);
    empty.data = [];
    Object.assign(empty.meta, { total: 0, last_page: 1, from: null, to: null });
    empty.links.next = null;
    empty.links.last = empty.links.first;
    api.on("facilities", (url) => (url.searchParams.has("open_at") ? { json: empty } : { json: fixtures.nearby }));
    await page.goto(resultsPath);

    await expect(page.getByText("この範囲に、この時間に開いている施設は見つかりませんでした。")).toBeVisible();
    await expect(page.getByRole("button", { name: "5km以内に広げる" })).toBeVisible();
    await page.getByRole("button", { name: "時間で絞らずに探す" }).click();

    await expect(page).toHaveURL(/[?&]when=any/);
    await expect(page.getByText(nearbyCount)).toBeVisible();
    expect(api.requestsTo("/api/v1/medical-facilities").at(-1)!.searchParams.has("open_at")).toBe(false);
  });

  test("地図に切り替えると、位置のある施設に印を立てる", async ({ page }) => {
    await page.goto(resultsPath);
    await page.getByRole("radio", { name: "地図" }).click();

    await expect(page).toHaveURL(/[?&]view=map/);
    // The markers are circles drawn in SVG (L.circleMarker), one per facility with a location.
    const withLocation = fixtures.nearby.data.filter((facility) => facility.location).length;
    await expect(page.locator("path.leaflet-interactive")).toHaveCount(withLocation);
  });

  test("URLの地名が電話番号のようなら、見出しに出さない", async ({ page }) => {
    await page.goto(`/?lat=${tokyoStation.latitude}&lng=${tokyoStation.longitude}&place=${encodeURIComponent("0120-123-456へ電話")}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("📍 指定した地点の近く");
  });

  test("紹介のQRコードは、いまのページではなくトップのURLを指す", async ({ page }) => {
    await page.goto(resultsPath);
    await page.getByRole("button", { name: "紹介する" }).click();

    // The current URL carries a location; the shared one must not.
    await expect(page.getByRole("img", { name: "http://127.0.0.1:4173/ のQRコード" })).toBeVisible();
  });
});
