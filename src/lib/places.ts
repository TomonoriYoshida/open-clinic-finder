/** The API accepts points within Japan's extent only. */
const latitudeRange = [20, 46] as const;
const longitudeRange = [122, 154] as const;

export type Place = { latitude: number; longitude: number };

export type NamedPlace = Place & { name: string };

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
  properties?: { title?: unknown };
};

/** Exact name first, then names starting with the keyword, then containing it, then the rest. */
function relevance(name: string, keyword: string): number {
  if (name === keyword) {
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
 * re-ranked, and the same name within about 1km (a station listed once per
 * line) is shown once.
 */
export async function searchPlaces(keyword: string, signal?: AbortSignal): Promise<NamedPlace[]> {
  const response = await fetch(
    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(keyword)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Address search failed: HTTP ${response.status}`);
  }
  const features = (await response.json()) as GsiFeature[];
  const seen = new Set<string>();

  return features
    .flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const name = feature.properties?.title;
      if (!Array.isArray(coordinates) || typeof name !== "string") {
        return [];
      }
      const place = { name, latitude: Number(coordinates[1]), longitude: Number(coordinates[0]) };
      return isWithinJapan(place) ? [place] : [];
    })
    .map((place, index) => ({ place, index, rank: relevance(place.name, keyword) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ place }) => place)
    .filter((place) => {
      const key = `${place.name}@${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}
