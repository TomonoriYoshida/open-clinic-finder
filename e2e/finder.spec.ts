import { formatDuration, formatOpenUntil, formatTimeAfter, minutesBetween } from "@/lib/time";
import { copy, fixtures } from "./fixtures";
import { allowLocation, expect, test, tokyoStation } from "./support";

/** "474件": the count line shows the API's total. */
const nearbyCount = `${fixtures.nearby.meta.total.toLocaleString("ja-JP")}件`;

/** The departure the nearby fixture was captured for: Monday 2026-10-05 08:30 in Japan. */
const departure = "2026-10-05T08:30:00+09:00";

/**
 * What a result of the nearby fixture says about its hours when reached on
 * foot: when it opens (and how long after arriving), or that it is open then
 * and until when; and the estimated walk.
 */
function statusTexts(facility: (typeof fixtures.nearby.data)[number]): string[] {
  const searchedAt = departure.slice(0, 16);
  const arrivesAt = facility.arrives_at!;
  const walk = `徒歩約${formatDuration(minutesBetween(departure, arrivesAt))}・${formatTimeAfter(arrivesAt, searchedAt)}ごろ着`;

  if (facility.opens_at) {
    return [`${formatTimeAfter(facility.opens_at, searchedAt)}から受付（着いて${formatDuration(minutesBetween(arrivesAt, facility.opens_at))}後）`, walk];
  }

  const closingSoon = minutesBetween(arrivesAt, facility.open_until!) <= 30;
  return [`${closingSoon ? "まもなく終了・" : "着くころ受付中・"}${formatOpenUntil(facility.open_until!, searchedAt)}`, walk];
}

test.describe("トップ（場所を選ぶ前）", () => {
  test("現在地か駅名・住所で探すように案内し、まだ施設を探さない", async ({ page, api }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("近くでいま開いている病院・薬局を探す");
    await expect(page.getByRole("button", { name: "📍 現在地から探す" })).toBeVisible();
    await expect(page.getByText("現在地は近くの施設を探すためだけに使い、保存しません。")).toBeVisible();
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
    // The clock is fixed at Monday 2026-10-05 08:30 in Japan: the departure,
    // each facility judged at its arrival on foot, or opening 30 minutes after.
    expect(query.get("open_at")).toBe("2026-10-05T08:30");
    expect(query.get("travel")).toBe("walk");
    expect(query.get("wait")).toBe("30");
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

  test("施設ごとに、着く時刻の目安と、そのころの受付の状況を表示する", async ({ page }) => {
    await page.goto(resultsPath);

    for (const facility of fixtures.nearby.data) {
      const item = page.getByRole("listitem").filter({ hasText: facility.name.replace(/\u3000/g, " ") });
      for (const text of statusTexts(facility)) {
        await expect(item).toContainText(text);
      }
    }
    // The fixture has both kinds: open on arrival, and opening a little after.
    expect(fixtures.nearby.data.some((facility) => facility.opens_at)).toBe(true);
    expect(fixtures.nearby.data.some((facility) => !facility.opens_at)).toBe(true);
  });

  test("日付をまたいで着く時刻には「翌」を付け、受付が短い施設は注意の色で知らせる", async ({ page, api }) => {
    const lateNight = copy(fixtures.nearby);
    const [nextDay, shortWindow] = lateNight.data;
    // Leaving at 23:40: one reached at 0:05 the next day, open until 2:00.
    Object.assign(nextDay, { arrives_at: "2026-10-06T00:05:00+09:00", opens_at: undefined, open_until: "2026-10-06T02:00:00+09:00" });
    // One that opens at 23:50 for only 20 minutes.
    Object.assign(shortWindow, { arrives_at: "2026-10-05T23:41:00+09:00", opens_at: "2026-10-05T23:50:00+09:00", open_until: "2026-10-06T00:10:00+09:00" });
    lateNight.data = [nextDay, shortWindow];
    api.on("facilities", () => ({ json: lateNight }));

    await page.goto(`${resultsPath}&when=2026-10-05T23:40`);

    const first = page.getByRole("listitem").filter({ hasText: nextDay.name.replace(/\u3000/g, " ") });
    await expect(first).toContainText("徒歩約25分・翌0:05ごろ着");
    await expect(first).toContainText("着くころ受付中・翌2:00まで");
    const second = page.getByRole("listitem").filter({ hasText: shortWindow.name.replace(/\u3000/g, " ") });
    await expect(second.getByText("23:50〜翌0:10のみ受付")).toHaveClass(/text-warning/);
  });

  test("車に切り替えると、車で着く時刻で探し、届くまでは前の時刻を車の時刻として出さない", async ({ page, api }) => {
    const byCar = copy(fixtures.nearby);
    for (const facility of byCar.data) {
      // By car everything is reached a few minutes sooner.
      facility.arrives_at = new Date(Date.parse(facility.arrives_at!) - 3 * 60000).toISOString().replace(/\.000Z$/, "+00:00");
    }
    api.on("facilities", (url) =>
      url.searchParams.get("travel") === "car" ? { json: byCar, delayMs: 1500 } : { json: fixtures.nearby },
    );
    await page.goto(resultsPath);
    await expect(page.getByText(/徒歩約/).first()).toBeVisible();

    await page.getByRole("radio", { name: "🚗 車" }).click();

    await expect(page).toHaveURL(/[?&]go=car/);
    // While the car search is under way: the walking results, dimmed, without their hours.
    await expect(page.getByRole("status").filter({ hasText: "更新中" })).toBeVisible();
    await expect(page.getByText(/車約|徒歩約/)).toHaveCount(0);

    await expect(page.getByText(/車約/).first()).toBeVisible();
    expect(api.requestsTo("/api/v1/medical-facilities").at(-1)!.searchParams.get("travel")).toBe("car");
  });

  test("見つからないときは、範囲を広げるか時間で絞らずに探せる", async ({ page, api }) => {
    const empty = copy(fixtures.nearby);
    empty.data = [];
    Object.assign(empty.meta, { total: 0, last_page: 1, from: null, to: null });
    empty.links.next = null;
    empty.links.last = empty.links.first;
    api.on("facilities", (url) => (url.searchParams.has("open_at") ? { json: empty } : { json: fixtures.nearby }));
    await page.goto(resultsPath);

    await expect(page.getByText("この範囲に、着くころ開いている施設や、まもなく開く施設は見つかりませんでした。")).toBeVisible();
    await expect(page.getByRole("button", { name: "5km以内に広げる" })).toBeVisible();
    await page.getByRole("button", { name: "時間で絞らずに探す" }).click();

    await expect(page).toHaveURL(/[?&]when=any/);
    await expect(page.getByText(nearbyCount)).toBeVisible();
    const query = api.requestsTo("/api/v1/medical-facilities").at(-1)!.searchParams;
    expect(query.has("open_at")).toBe(false);
    expect(query.has("travel")).toBe(false);
    // Without a time, there is no arrival to judge, so no way of travelling to pick.
    await expect(page.getByRole("radiogroup", { name: "移動手段" })).toHaveCount(0);
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
