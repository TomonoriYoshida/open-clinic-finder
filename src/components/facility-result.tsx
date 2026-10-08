import Link from "next/link";
import DepartmentTags from "@/components/department-tags";
import type { MedicalFacility } from "@/lib/api/types";
import { formatDistance } from "@/lib/format";
import { formatOpenUntil, minutesUntil } from "@/lib/time";

/** Closing within this many minutes is flagged, so nobody sets off for a door about to shut. */
const closingSoonMinutes = 30;

export function directionsUrl(facility: Pick<MedicalFacility, "name" | "address" | "location" | "prefecture">): string {
  const destination = facility.location
    ? `${facility.location.latitude},${facility.location.longitude}`
    : `${facility.prefecture.label}${facility.address} ${facility.name}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export const actionClass =
  "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-bold text-accent hover:bg-band";

export default function FacilityResult({
  facility,
  searchedAt,
}: {
  facility: MedicalFacility;
  /** The Japan-local time searched for, when the list is narrowed to open facilities. */
  searchedAt: string | null;
}) {
  const closingSoon =
    searchedAt !== null && facility.open_until !== undefined && minutesUntil(facility.open_until, searchedAt) <= closingSoonMinutes;

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <Link href={`/facility/?id=${facility.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-foreground underline-offset-2 hover:underline">{facility.name}</h2>
          {facility.distance !== undefined && (
            <span className="shrink-0 text-sm font-bold text-accent">{formatDistance(facility.distance)}</span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{facility.institution_type.label}</span>
          {searchedAt !== null && facility.open_until !== undefined && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                closingSoon ? "bg-warning/15 text-warning" : "bg-band text-accent"
              }`}
            >
              {closingSoon ? "まもなく終了・" : "受付中・"}
              {formatOpenUntil(facility.open_until, searchedAt)}
            </span>
          )}
        </p>
        <DepartmentTags departments={facility.department_categories} max={4} className="mt-2" />
      </Link>
      <div className="mt-3 flex gap-2">
        {facility.phone_number && (
          <a href={`tel:${facility.phone_number}`} className={actionClass}>
            📞 電話
          </a>
        )}
        <a href={directionsUrl(facility)} target="_blank" rel="noopener noreferrer" className={actionClass}>
          🗺 経路
        </a>
      </div>
    </article>
  );
}
