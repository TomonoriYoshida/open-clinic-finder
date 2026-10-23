import { test as base, expect, type Route } from "@playwright/test";
import { fixtures } from "./fixtures";

/** The API origin the e2e build is made with (`npm run build:e2e`). */
export const apiOrigin = "http://api.test";

/** The GSI address search the place search calls from the browser. */
export const placeSearchOrigin = "https://msearch.gsi.go.jp";

/** Monday, 2026-10-05 10:30 in Japan: the clock every test runs at. */
export const now = new Date("2026-10-05T10:30:00+09:00");

/** In front of Tokyo Station, where the nearby fixture was captured. */
export const tokyoStation = { latitude: 35.681236, longitude: 139.767125 };

type Reply = { status?: number; json: unknown };
type Responder = (url: URL) => Reply;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

/** The endpoints the site calls, each with its default reply. */
const defaultReplies = {
  options: { pattern: /^\/api\/v1\/options$/, responder: () => ({ json: fixtures.options }) },
  facilities: { pattern: /^\/api\/v1\/medical-facilities$/, responder: () => ({ json: fixtures.nearby }) },
  facility: { pattern: /^\/api\/v1\/medical-facilities\/\d+$/, responder: () => ({ json: fixtures.facility }) },
  openingHours: {
    pattern: /^\/api\/v1\/medical-facilities\/\d+\/opening-hours$/,
    responder: () => ({ json: fixtures.openingHours }),
  },
  placeSearch: { pattern: /^\/address-search\/AddressSearch$/, responder: () => ({ json: fixtures.gsiShinjuku }) },
} satisfies Record<string, { pattern: RegExp; responder: Responder }>;

type Endpoint = keyof typeof defaultReplies;

/**
 * Answers the site's API and place search requests from fixtures. Each
 * endpoint has a default reply; a test replaces one with `on()`. Requests
 * are recorded, and a request no endpoint matches fails the test, so an
 * endpoint the site starts calling cannot go untested unnoticed.
 */
export class MockApi {
  readonly requests: URL[] = [];
  readonly unhandled: string[] = [];

  private readonly responders = new Map<Endpoint, { pattern: RegExp; responder: Responder }>(
    Object.entries(defaultReplies).map(([name, reply]) => [name as Endpoint, { ...reply }]),
  );

  /** Replaces the reply for one endpoint. */
  on(name: Endpoint, responder: Responder): void {
    this.responders.get(name)!.responder = responder;
  }

  /** The recorded requests whose path matches. */
  requestsTo(path: string | RegExp): URL[] {
    return this.requests.filter((url) => (typeof path === "string" ? url.pathname === path : path.test(url.pathname)));
  }

  async handle(route: Route, url: URL): Promise<void> {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    this.requests.push(url);
    const entry = [...this.responders.values()].find(({ pattern }) => pattern.test(url.pathname));

    if (!entry) {
      this.unhandled.push(`${url.origin}${url.pathname}${url.search}`);
      await route.fulfill({ status: 404, headers: corsHeaders, json: { message: "見つかりません。" } });
      return;
    }

    const { status = 200, json } = entry.responder(url);
    await route.fulfill({ status, headers: corsHeaders, json });
  }
}

/**
 * The API and the place search are answered from fixtures, every other host
 * but the site itself is cut off (map tiles included), and the clock is fixed
 * at `now`. Geolocation is off unless a test grants it (`allowLocation`).
 */
export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ context, page }, use) => {
      const api = new MockApi();

      await context.route(/.*/, async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === apiOrigin || url.origin === placeSearchOrigin) {
          await api.handle(route, url);
        } else if (url.hostname === "127.0.0.1") {
          await route.fallback();
        } else {
          await route.abort();
        }
      });
      await page.clock.setFixedTime(now);

      await use(api);

      expect(api.unhandled, "Requests with no fixture").toEqual([]);
    },
    // Every test runs against the fixtures, whether or not it uses `api`.
    { auto: true },
  ],
});

/** Lets the page read the visitor's position as `place`. */
export async function allowLocation(context: import("@playwright/test").BrowserContext, place = tokyoStation): Promise<void> {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(place);
}

export { expect };
