/** The API accepts points within Japan's extent only. */
const latitudeRange = [20, 46] as const;
const longitudeRange = [122, 154] as const;

export type Place = { latitude: number; longitude: number };

export type NamedPlace = Place & {
  name: string;
  /** The prefecture and municipality, when the name doesn't say where it is (a bare 新橋). */
  area: string | null;
};

/** A search result, with its distance in meters from the point it was sorted by (null without one). */
export type PlaceCandidate = NamedPlace & { distance: number | null };

/** Great-circle distance in meters. */
export function distanceBetween(a: Place, b: Place): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLatitude = radians(b.latitude - a.latitude);
  const dLongitude = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLongitude / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * The visitor's position, but only if they already allowed it: sorting
 * search results is no reason to ask. Null when not allowed, not known
 * (Permissions API missing) or not found quickly.
 */
export async function currentPositionIfAllowed(): Promise<Place | null> {
  try {
    const permission = await navigator.permissions?.query({ name: "geolocation" });
    if (permission?.state !== "granted") {
      return null;
    }
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        resolve(isWithinJapan(place) ? place : null);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export function isWithinJapan(place: Place): boolean {
  return (
    place.latitude >= latitudeRange[0] &&
    place.latitude <= latitudeRange[1] &&
    place.longitude >= longitudeRange[0] &&
    place.longitude <= longitudeRange[1]
  );
}

/**
 * About 100m. The point goes into the URL, which visitors copy and share,
 * so it is kept no more precise than finding nearby facilities needs.
 */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e3) / 1e3;
}

export function parsePlace(latitude: string | null, longitude: string | null): Place | null {
  if (!latitude || !longitude) {
    return null;
  }
  const place = { latitude: Number(latitude), longitude: Number(longitude) };
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && isWithinJapan(place)
    ? place
    : null;
}

type GsiFeature = {
  geometry?: { coordinates?: unknown };
  properties?: { title?: unknown; addressCode?: unknown };
};

const prefecturePattern = /^(北海道|東京都|(京都|大阪)府|.{2,3}県)/;

/**
 * The search returns towns as either a full address (東京都港区新橋) or a
 * bare name with a municipality code (新橋, 13103), the code's leading zero
 * sometimes dropped (4213 for 04213). The code → name table comes from the
 * API's municipalities (アドレス・ベース・レジストリ) and is loaded only when
 * a search is made.
 */
async function areaOf(name: string, addressCode: unknown): Promise<string | null> {
  if (prefecturePattern.test(name) || typeof addressCode !== "string" || !/^\d{4,5}$/.test(addressCode)) {
    return null;
  }
  const { default: municipalities } = await import("./municipalities.json");
  return (municipalities as Record<string, string>)[addressCode.padStart(5, "0")] ?? null;
}

/**
 * Exact name first, then names starting with the keyword, then containing it,
 * then the rest. A full address ending in the keyword (東京都港区新橋 for 新橋)
 * counts as exact.
 */
function relevance(place: NamedPlace, keyword: string): number {
  const { name } = place;
  if (name === keyword || (place.area === null && prefecturePattern.test(name) && name.endsWith(keyword))) {
    return 0;
  }
  if (name.startsWith(keyword)) {
    return 1;
  }
  return name.includes(keyword) ? 2 : 3;
}

/**
 * Looks up an address or place name (駅名 too) with the 国土地理院
 * 住所検索API, which needs no key and allows calls from browsers. Its order
 * puts the station asked for behind like-named towns, so the results are
 * re-ranked, and the same place within about 1km (a station listed once per
 * line, a town listed both ways) is shown once. Given an origin, equally
 * relevant places come nearest first (新橋 near you before the other 新橋s);
 * relevance still leads, so 新宿駅 is not pushed down by a nearer 新宿町.
 */
export async function searchPlaces(keyword: string, origin: Place | null = null, signal?: AbortSignal): Promise<PlaceCandidate[]> {
  const response = await fetch(
    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(keyword)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Address search failed: HTTP ${response.status}`);
  }
  const features = (await response.json()) as GsiFeature[];
  const places: NamedPlace[] = [];

  for (const feature of features) {
    const coordinates = feature.geometry?.coordinates;
    const name = feature.properties?.title;
    if (!Array.isArray(coordinates) || typeof name !== "string") {
      continue;
    }
    const place = {
      name,
      area: await areaOf(name, feature.properties?.addressCode),
      latitude: Number(coordinates[1]),
      longitude: Number(coordinates[0]),
    };
    if (isWithinJapan(place)) {
      places.push(place);
    }
  }

  const seen = new Set<string>();

  return places
    .map((place, index) => ({
      place: { ...place, distance: origin ? distanceBetween(origin, place) : null },
      index,
      rank: relevance(place, keyword),
    }))
    .sort((a, b) => a.rank - b.rank || (a.place.distance ?? 0) - (b.place.distance ?? 0) || a.index - b.index)
    .map(({ place }) => place)
    .filter((place) => {
      const key = `${place.area ?? ""}${place.name}@${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
