"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AttributionNotice from "@/components/attribution-notice";
import BottomSheet, { OptionGrid } from "@/components/bottom-sheet";
import EmergencyNotice from "@/components/emergency-notice";
import FacilityResult from "@/components/facility-result";
import LocationPicker from "@/components/location-picker";
import FacilityMap, { type MapMarker } from "@/components/map/facility-map";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { useFacilities, useOptions } from "@/lib/api/queries";
import type { FacilityListQuery } from "@/lib/api/types";
import { hasDepartmentFilter } from "@/lib/departments";
import { formatDistance, numberFormatter } from "@/lib/format";
import { markListVisited } from "@/lib/navigation";
import { isWithinJapan, parsePlace, roundCoordinate, type NamedPlace } from "@/lib/places";
import { activeStatus, institutionTypes } from "@/lib/site";
import { formatJapanLocalTime, formatJapanLocalTimeShort, japanLocalTime, useCurrentMinute } from "@/lib/time";

const radiusOptions = [500, 1000, 2000, 5000, 10000];
const defaultRadius = 2000;
/** Nearest first; anything further is rarely where anyone heads to. */
const perPage = 50;

const typeOptions: { value: string; label: string }[] = [
  { value: "", label: "すべて" },
  { value: String(institutionTypes.hospital), label: "病院" },
  { value: String(institutionTypes.clinic), label: "診療所" },
  { value: String(institutionTypes.dental), label: "歯科" },
  { value: String(institutionTypes.pharmacy), label: "薬局" },
];

/** `when`: absent for "now", "any" for no time filter, else a Japan-local "YYYY-MM-DDTHH:mm". */
const anyTime = "any";
const localTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const labelClass = "mb-1 block text-xs font-bold text-muted";

export default function Finder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useCurrentMinute();
  const options = useOptions();
  const [changingPlace, setChangingPlace] = useState(false);
  const [openSheet, setOpenSheet] = useState<"when" | "radius" | "dept" | null>(null);

  useEffect(markListVisited, []);

  const place = parsePlace(searchParams.get("lat"), searchParams.get("lng"));
  const placeName = searchParams.get("place") || "指定した地点";
  const radiusParam = Number(searchParams.get("r"));
  const radius = radiusOptions.includes(radiusParam) ? radiusParam : defaultRadius;
  const institutionType = typeOptions.some(({ value }) => value === searchParams.get("type"))
    ? (searchParams.get("type") ?? "")
    : "";
  const showsDepartmentFilter = hasDepartmentFilter(institutionType);
  const departmentCategory = showsDepartmentFilter ? (searchParams.get("dept") ?? "") : "";
  const whenParam = searchParams.get("when");
  const when = whenParam === anyTime || (whenParam && localTimePattern.test(whenParam)) ? whenParam : null;
  const searchedAt = when === anyTime ? null : (when ?? (now ? japanLocalTime(now) : null));

  const query = {
    latitude: place?.latitude ?? 0,
    longitude: place?.longitude ?? 0,
    radius,
    status: activeStatus,
    per_page: perPage,
    ...(searchedAt ? { open_at: searchedAt } : {}),
    ...(institutionType ? { institution_type: Number(institutionType) } : {}),
    ...(departmentCategory ? { department_category: Number(departmentCategory) } : {}),
  } as FacilityListQuery;
  // "Now" is only known in the browser, after the first render.
  const facilities = useFacilities(query, { enabled: place !== null && (when !== null || now !== null) });

  function update(changes: Record<string, string | number | null>, { push = false } = {}) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    const url = `/?${params.toString()}`;
    if (push) {
      router.push(url, { scroll: false });
    } else {
      router.replace(url, { scroll: false });
    }
  }

  function pick(picked: NamedPlace) {
    setChangingPlace(false);
    update(
      { lat: roundCoordinate(picked.latitude), lng: roundCoordinate(picked.longitude), place: picked.name },
      { push: true },
    );
  }

  const results = facilities.data?.data;
  const markers = useMemo<MapMarker[]>(
    () =>
      (results ?? []).flatMap((facility) =>
        facility.location
          ? [
              {
                id: facility.id,
                latitude: facility.location.latitude,
                longitude: facility.location.longitude,
                title: facility.name,
                detail: [facility.institution_type.label, facility.distance !== undefined ? formatDistance(facility.distance) : null]
                  .filter(Boolean)
                  .join("・"),
              },
            ]
          : [],
      ),
    [results],
  );

  if (place === null) {
    return (
      <div className="space-y-6">
        <section className="pt-4">
          <h1 className="text-2xl leading-snug font-bold">
            近くで<span className="text-accent">いま開いている</span>
            <br />
            病院・薬局を探す
          </h1>
          <p className="mt-2 text-sm text-muted">全国の病院・診療所・歯科・薬局から、近い順に表示します。</p>
        </section>
        <LocationPicker onPick={pick} prominent />
        <EmergencyNotice />
      </div>
    );
  }

  const nextRadius = radiusOptions.find((option) => option > radius);
  const isMapView = searchParams.get("view") === "map";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-bold">
          <span aria-hidden>📍 </span>
          {placeName}の近く
        </p>
        <button
          type="button"
          onClick={() => setChangingPlace((value) => !value)}
          aria-expanded={changingPlace}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-sm text-accent hover:bg-band"
        >
          {changingPlace ? "閉じる" : "場所を変える"}
        </button>
      </div>
      {changingPlace && <LocationPicker onPick={pick} />}

      <div className="space-y-2 rounded-xl bg-surface p-3">
        <div role="radiogroup" aria-label="種類" className="grid grid-cols-5 gap-1">
          {typeOptions.map(({ value, label }) => (
            <button
              key={value || "all"}
              type="button"
              role="radio"
              aria-checked={institutionType === value}
              onClick={() => update({ type: value, ...(hasDepartmentFilter(value) ? {} : { dept: null }) })}
              className={`rounded-full px-1 py-1.5 text-sm font-bold ${
                institutionType === value ? "bg-brand text-white" : "border border-border bg-background text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton isChanged={when !== null} onClick={() => setOpenSheet("when")}>
            🕐 {when === null ? "いま開いている" : when === anyTime ? "時間で絞らない" : formatJapanLocalTimeShort(when)}
          </FilterButton>
          <FilterButton isChanged={radius !== defaultRadius} onClick={() => setOpenSheet("radius")}>
            {formatDistance(radius)}以内
          </FilterButton>
          {showsDepartmentFilter && (
            <FilterButton isChanged={departmentCategory !== ""} onClick={() => setOpenSheet("dept")}>
              {departmentCategory
                ? (options.data?.department_categories.find(({ code }) => String(code) === departmentCategory)?.label ?? "診療科")
                : "診療科"}
            </FilterButton>
          )}
        </div>
      </div>

      <BottomSheet open={openSheet === "when"} onClose={() => setOpenSheet(null)} title="いつ開いている施設を探しますか">
        <OptionGrid
          columns={3}
          options={[
            { value: "now", label: "いま" },
            { value: "at", label: "日時を指定" },
            { value: anyTime, label: "時間で絞らない" },
          ]}
          selected={when === null ? "now" : when === anyTime ? anyTime : "at"}
          onSelect={(value) => {
            if (value === "at") {
              // Stays open for the date and time; searches for an hour from now meanwhile.
              if (when === null || when === anyTime) {
                update({ when: japanLocalTime(new Date(Date.now() + 60 * 60 * 1000)) });
              }
              return;
            }
            update({ when: value === "now" ? null : value });
            setOpenSheet(null);
          }}
        />
        {when !== null && when !== anyTime && (
          <div className="mt-4">
            <label htmlFor="at" className={labelClass}>
              日時（日本時間）
            </label>
            <input
              id="at"
              type="datetime-local"
              value={when}
              onChange={(event) => event.currentTarget.value && update({ when: event.currentTarget.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setOpenSheet(null)}
              className="mt-3 w-full rounded-xl bg-brand px-4 py-3 font-bold text-white hover:opacity-90"
            >
              この日時で探す
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={openSheet === "radius"} onClose={() => setOpenSheet(null)} title="どのくらいの範囲で探しますか">
        <OptionGrid
          columns={3}
          options={radiusOptions.map((option) => ({ value: option, label: `${formatDistance(option)}以内` }))}
          selected={radius}
          onSelect={(value) => {
            update({ r: value === defaultRadius ? null : value });
            setOpenSheet(null);
          }}
        />
      </BottomSheet>

      <BottomSheet open={openSheet === "dept"} onClose={() => setOpenSheet(null)} title="診療科">
        {options.data ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <OptionGrid
              columns={3}
              options={[
                { value: "", label: "すべて" },
                ...options.data.department_categories.map(({ code, label }) => ({ value: String(code), label })),
              ]}
              selected={departmentCategory}
              onSelect={(value) => {
                update({ dept: value });
                setOpenSheet(null);
              }}
            />
          </div>
        ) : options.isError ? (
          <ErrorState error={options.error} />
        ) : (
          <LoadingState />
        )}
      </BottomSheet>

      <section aria-live="polite">
        {facilities.isPending ? (
          <LoadingState label="探しています…" />
        ) : facilities.isError ? (
          <ErrorState error={facilities.error} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {searchedAt && when !== null && <>{formatJapanLocalTime(searchedAt)}に開いている</>}
                <span className="font-bold text-foreground">{numberFormatter.format(facilities.data.meta.total)}件</span>
                {facilities.data.meta.total > perPage && `（近い${perPage}件）`}
                {facilities.isPlaceholderData && <span role="status"> 更新中…</span>}
              </p>
              <div role="radiogroup" aria-label="表示" className="flex shrink-0 rounded-full border border-border p-0.5 text-sm">
                {[
                  { value: null, label: "リスト" },
                  { value: "map", label: "地図" },
                ].map(({ value, label }) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={isMapView === (value === "map")}
                    onClick={() => update({ view: value })}
                    className={`rounded-full px-3 py-1 ${isMapView === (value === "map") ? "bg-brand font-bold text-white" : "text-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isMapView && (
              <div className="relative mt-3">
                <FacilityMap
                  center={place}
                  zoom={15}
                  radius={radius}
                  markers={markers}
                  onCenterChange={(center) => {
                    if (
                      isWithinJapan(center) &&
                      (roundCoordinate(center.latitude) !== place.latitude ||
                        roundCoordinate(center.longitude) !== place.longitude)
                    ) {
                      update({
                        lat: roundCoordinate(center.latitude),
                        lng: roundCoordinate(center.longitude),
                        place: "地図の中心",
                      });
                    }
                  }}
                  onMarkerSelect={(id) => router.push(`/facility/?id=${id}`)}
                  className="h-[60vh] rounded-xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-1/2 text-2xl leading-none font-bold text-danger"
                >
                  +
                </div>
              </div>
            )}

            {facilities.data.data.length === 0 ? (
              <div className="mt-3 space-y-3">
                <EmptyState>
                  {searchedAt ? "この範囲に、この時間に開いている施設は見つかりませんでした。" : "この範囲に施設は見つかりませんでした。"}
                </EmptyState>
                <div className="flex flex-wrap justify-center gap-2">
                  {nextRadius && (
                    <button type="button" onClick={() => update({ r: nextRadius })} className="rounded-full border border-accent px-4 py-2 text-sm font-bold text-accent hover:bg-band">
                      {formatDistance(nextRadius)}以内に広げる
                    </button>
                  )}
                  {searchedAt && (
                    <button type="button" onClick={() => update({ when: anyTime })} className="rounded-full border border-accent px-4 py-2 text-sm font-bold text-accent hover:bg-band">
                      時間で絞らずに探す
                    </button>
                  )}
                </div>
              </div>
            ) : (
              !isMapView && (
                <ul className={`mt-3 space-y-3 transition-opacity ${facilities.isPlaceholderData ? "opacity-60" : ""}`}>
                  {facilities.data.data.map((facility) => (
                    <li key={facility.id}>
                      <FacilityResult facility={facility} searchedAt={searchedAt} />
                    </li>
                  ))}
                </ul>
              )
            )}

            {searchedAt && (
              <p className="mt-4 text-xs leading-5 text-muted">
                ※ 受付時間（なければ診療時間）で判定しています。臨時休診や最近の変更は反映されず、診療時間が公開されていない施設は表示されません。
                お出かけの前に電話でご確認ください。
              </p>
            )}
            <div className="mt-4">
              <EmergencyNotice />
            </div>
            <AttributionNotice attribution={facilities.data.meta.attribution} />
          </>
        )}
      </section>
    </div>
  );
}

/** Shows a filter's current value; tapping it opens that filter's sheet. Changed values stand out. */
function FilterButton({ isChanged, onClick, children }: { isChanged: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-bold ${
        isChanged ? "border-accent bg-band text-accent" : "border-border bg-background text-foreground"
      }`}
    >
      {children}
      <span aria-hidden className="text-xs text-muted">
        ▾
      </span>
    </button>
  );
}
