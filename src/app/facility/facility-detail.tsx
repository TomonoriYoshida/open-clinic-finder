"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AttributionNotice from "@/components/attribution-notice";
import DepartmentTags from "@/components/department-tags";
import EmergencyNotice from "@/components/emergency-notice";
import { actionClass, directionsUrl } from "@/components/facility-result";
import FacilityMap from "@/components/map/facility-map";
import NewTabMark from "@/components/new-tab-mark";
import OpeningHoursTimetable from "@/components/opening-hours";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { useFacility, useFacilityOpeningHours } from "@/lib/api/queries";
import { listWasVisited } from "@/lib/navigation";
import { institutionTypes, siteName } from "@/lib/site";

function parseId(value: string | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Back to the list as it was, if the visitor came from it; else to the top. */
function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (listWasVisited()) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="-ml-2 inline-flex min-h-11 items-center px-2 text-muted hover:text-accent"
    >
      ← 一覧に戻る
    </button>
  );
}

export default function FacilityDetail() {
  const id = parseId(useSearchParams().get("id"));
  const facility = useFacility(id);
  const openingHours = useFacilityOpeningHours(id);

  if (id === null) {
    return (
      <EmptyState>
        施設が指定されていません。
        <Link href="/" className="text-accent underline underline-offset-2">
          トップ
        </Link>
        から探してください。
      </EmptyState>
    );
  }
  if (facility.isPending) {
    return <LoadingState />;
  }
  if (facility.isError) {
    return <ErrorState error={facility.error} />;
  }

  const { data, meta } = facility.data;
  const isPharmacy = data.institution_type.code === institutionTypes.pharmacy;
  const hoursLabel = isPharmacy ? "営業時間" : "診療時間";

  return (
    <div className="space-y-6">
      <title>{`${data.name} | ${siteName}`}</title>
      <BackLink />

      <header>
        <p className="text-sm font-bold text-accent">{data.institution_type.label}</p>
        <h1 className="mt-1 text-xl leading-snug font-bold sm:text-2xl">{data.name}</h1>
        <p className="mt-2 leading-relaxed text-muted">
          {data.postal_code && <span className="mr-2">〒{data.postal_code}</span>}
          {data.prefecture.label}
          {data.address}
        </p>
        <div className="mt-4 flex gap-2">
          {data.phone_number && (
            <a href={`tel:${data.phone_number}`} className={actionClass}>
              📞 {data.phone_number}
            </a>
          )}
          <a href={directionsUrl(data)} target="_blank" rel="noopener noreferrer" className={actionClass}>
            🗺 経路
            <NewTabMark />
          </a>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-bold">{hoursLabel}</h2>
        {openingHours.isPending ? (
          <LoadingState />
        ) : openingHours.isError ? (
          <div className="mt-3">
            <ErrorState error={openingHours.error} />
          </div>
        ) : openingHours.data === null ? (
          <div className="mt-3">
            <EmptyState>
              {hoursLabel}が公開されていません。お電話でご確認ください。
            </EmptyState>
          </div>
        ) : (
          <OpeningHoursTimetable openingHours={openingHours.data} isPharmacy={isPharmacy} />
        )}
      </section>

      {data.department_categories.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">診療科</h2>
          <DepartmentTags departments={data.department_categories} className="mt-2" />
        </section>
      )}

      {data.location && (
        <section>
          <h2 className="sr-only">地図</h2>
          <FacilityMap
            center={data.location}
            zoom={16}
            markers={[{ id: data.id, latitude: data.location.latitude, longitude: data.location.longitude, title: data.name }]}
            highlightedId={data.id}
            className="h-64 rounded-xl"
          />
        </section>
      )}

      <EmergencyNotice />
      <AttributionNotice attribution={meta.attribution} />
    </div>
  );
}
