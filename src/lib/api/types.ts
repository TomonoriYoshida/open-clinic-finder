import type { components, operations } from "./schema";

type Schemas = components["schemas"];
type JsonOf<Operation extends keyof operations> = operations[Operation]["responses"] extends {
  200: { content: { "application/json": infer Json } };
}
  ? Json
  : never;

/* Types come from the OpenAPI spec the API generates (npm run generate:api). */

export type CodeLabel = { code: number; label: string };

export type MedicalFacility = Schemas["MedicalFacilityResource"];

/**
 * The list with page numbers. The API also answers in cursor form
 * (pagination=cursor), which this site never asks for.
 */
export type FacilityPage = Extract<JsonOf<"v1.medical-facilities.index">, { meta: { last_page: number } }>;

export type Attribution = FacilityPage["meta"]["attribution"];

export type Options = JsonOf<"v1.options">["data"];

export type OpeningHoursResponse = JsonOf<"v1.medical-facilities.opening-hours">;

/** A facility's hours from the MHLW 医療情報ネット (null when no single match was found). */
export type OpeningHours = NonNullable<OpeningHoursResponse["data"]>;

export type OpeningHoursSchedule = OpeningHours["schedules"][number];

export type OpeningHoursSlot = OpeningHoursSchedule["slots"][number];

/** mon〜sun, and holiday for public holidays. */
export type ScheduleDay = OpeningHoursSlot["days"][number]["day"];

export type Closures = NonNullable<OpeningHours["closures"]>;

export type FacilityListQuery = NonNullable<
  operations["v1.medical-facilities.index"]["parameters"]["query"]
>;
