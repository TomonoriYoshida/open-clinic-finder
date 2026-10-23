import type { operations } from "@/lib/api/schema";
import facilityJson from "./facility.json";
import gsiShinjukuJson from "./gsi-shinjuku.json";
import nearbyJson from "./nearby.json";
import openingHoursJson from "./opening-hours.json";
import optionsJson from "./options.json";

/*
 * Responses captured from the API and the GSI place search (see README
 * 「画面のテスト」), typed with the OpenAPI types. JSON imports widen literal
 * types (e.g. "mon" to string), so they are cast rather than checked;
 * capturing them from the real services is what keeps their shape honest.
 */

type JsonOf<Operation extends keyof operations> = operations[Operation]["responses"] extends {
  200: { content: { "application/json": infer Json } };
}
  ? Json
  : never;

export type FacilityListJson = Extract<JsonOf<"v1.medical-facilities.index">, { meta: { last_page: number } }>;
export type FacilityJson = JsonOf<"v1.medical-facilities.show">;
export type OpeningHoursJson = JsonOf<"v1.medical-facilities.opening-hours">;
export type OptionsJson = JsonOf<"v1.options">;

export const fixtures = {
  options: optionsJson as unknown as OptionsJson,
  /** The 5 nearest facilities open on Monday 2026-10-05 10:30 around Tokyo Station (1,043 in all). */
  nearby: nearbyJson as unknown as FacilityListJson,
  facility: facilityJson as unknown as FacilityJson,
  openingHours: openingHoursJson as unknown as OpeningHoursJson,
  /** GSI's address search for 新宿駅. */
  gsiShinjuku: gsiShinjukuJson as unknown[],
};

/** A deep copy to change in one test without touching the others. */
export function copy<T>(value: T): T {
  return structuredClone(value);
}
