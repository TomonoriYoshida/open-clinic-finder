import Link from "next/link";
import DepartmentTags from "@/components/department-tags";
import EPrescriptionBadges from "@/components/e-prescription-badges";
import NewTabMark from "@/components/new-tab-mark";
import type { MedicalFacility } from "@/lib/api/types";
import { formatDistance } from "@/lib/format";
import { formatDuration, formatOpenUntil, formatTimeAfter, japanIsoTime, minutesBetween } from "@/lib/time";

/** Closing within this many minutes is flagged, so nobody sets off for a door about to shut. */
const closingSoonMinutes = 30;

export type TravelMode = "walk" | "car";

const travelLabels: Record<TravelMode, string> = { walk: "徒歩", car: "車" };

export function directionsUrl(facility: Pick<MedicalFacility, "name" | "address" | "location" | "prefecture">): string {
  const destination = facility.location
    ? `${facility.location.latitude},${facility.location.longitude}`
    : `${facility.prefecture.label}${facility.address} ${facility.name}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export const actionClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-control-border px-3 font-bold text-accent hover:bg-band";

/**
 * How a facility's hours stand when the visitor gets there (or at the time
 * searched, without travel): open until when, closing soon, or opening a
 * little after the arrival. `warns` flags a short window: closing within
 * 30 minutes of the arrival, or open for no more than 30 minutes once it opens.
 */
export function openingStatus(
  facility: Pick<MedicalFacility, "open_until" | "opens_at" | "arrives_at">,
  searchedAt: string,
): { text: string; warns: boolean } | null {
  if (facility.open_until === undefined) {
    return null;
  }

  const until = formatOpenUntil(facility.open_until, searchedAt);

  if (facility.opens_at) {
    const opens = formatTimeAfter(facility.opens_at, searchedAt);
    if (minutesBetween(facility.opens_at, facility.open_until) <= closingSoonMinutes) {
      return { text: `${opens}〜${until.replace(/まで$/, "")}のみ受付`, warns: true };
    }
    const afterArrival = facility.arrives_at ? `（着いて${formatDuration(minutesBetween(facility.arrives_at, facility.opens_at))}後）` : "";
    return { text: `${opens}から受付${afterArrival}`, warns: false };
  }

  const from = facility.arrives_at ?? japanIsoTime(searchedAt);
  if (minutesBetween(from, facility.open_until) <= closingSoonMinutes) {
    return { text: `まもなく終了・${until}`, warns: true };
  }
  return { text: `${facility.arrives_at ? "着くころ受付中" : "受付中"}・${until}`, warns: false };
}

/** The estimated trip, "徒歩約12分・8:52ごろ着", when the list is judged at each arrival. */
function travelText(arrivesAt: string, searchedAt: string, travel: TravelMode): string {
  return `${travelLabels[travel]}約${formatDuration(minutesBetween(japanIsoTime(searchedAt), arrivesAt))}・${formatTimeAfter(arrivesAt, searchedAt)}ごろ着`;
}

export default function FacilityResult({
  facility,
  searchedAt,
  travel = null,
}: {
  facility: MedicalFacility;
  /** The Japan-local time searched for (the departure, when travelling), when the list is narrowed to open facilities. */
  searchedAt: string | null;
  /** How the visitor travels, when the list is judged at each facility's arrival. */
  travel?: TravelMode | null;
}) {
  const status = searchedAt === null ? null : openingStatus(facility, searchedAt);

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <Link href={`/facility/?id=${facility.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-foreground underline-offset-2 hover:underline">{facility.name}</h2>
          {facility.distance !== undefined && (
            <span className="shrink-0 font-bold text-accent">{formatDistance(facility.distance)}</span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <span>{facility.institution_type.label}</span>
          {status && (
            <span
              className={`rounded-full px-2 py-0.5 text-sm font-bold ${status.warns ? "bg-warning/15 text-warning" : "bg-band text-accent"}`}
            >
              {status.text}
            </span>
          )}
          {searchedAt !== null && travel !== null && facility.arrives_at && (
            <span className="text-sm">{travelText(facility.arrives_at, searchedAt, travel)}</span>
          )}
        </p>
        <DepartmentTags departments={facility.department_categories} max={4} className="mt-2" />
        <EPrescriptionBadges ePrescription={facility.e_prescription} className="mt-2" />
      </Link>
      <div className="mt-3 flex gap-2">
        {facility.phone_number && (
          <a href={`tel:${facility.phone_number}`} className={actionClass}>
            📞 電話
          </a>
        )}
        <a href={directionsUrl(facility)} target="_blank" rel="noopener noreferrer" className={actionClass}>
          🗺 経路
          <NewTabMark />
        </a>
      </div>
    </article>
  );
}
