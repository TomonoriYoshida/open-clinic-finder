import type { Closures, OpeningHours, OpeningHoursSchedule, ScheduleDay } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

const days: { day: ScheduleDay; label: string }[] = [
  { day: "mon", label: "月" },
  { day: "tue", label: "火" },
  { day: "wed", label: "水" },
  { day: "thu", label: "木" },
  { day: "fri", label: "金" },
  { day: "sat", label: "土" },
  { day: "sun", label: "日" },
  { day: "holiday", label: "祝" },
];

const dayLabels = Object.fromEntries(days.map(({ day, label }) => [day, label])) as Record<ScheduleDay, string>;

/**
 * Today's day of the week in Japan, where these facilities are. Whether today
 * is a public holiday isn't known here; the 祝 column is there for that.
 */
function todayInJapan(): ScheduleDay {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Tokyo" })
    .format(new Date())
    .toLowerCase() as ScheduleDay;
}

function range(from: string | null, to: string | null): string {
  return `${from ?? ""}–${to ?? ""}`;
}

/** Each slot's hours on the day (null where the slot has none), in slot order. */
function hoursOn(schedule: OpeningHoursSchedule, day: ScheduleDay) {
  return schedule.slots.map((slot) => {
    const entry = slot.days.find((candidate) => candidate.day === day);
    return entry && (entry.opens || entry.closes) ? range(entry.opens, entry.closes) : null;
  });
}

/**
 * Reception hours are often entered on one slot for the whole day (09:30–16:30
 * on the morning slot, nothing on the afternoon), so they're shown per day
 * rather than per slot.
 */
function receptionOn(schedule: OpeningHoursSchedule, day: ScheduleDay): string[] {
  return schedule.slots.flatMap((slot) =>
    slot.days
      .filter((entry) => entry.day === day && (entry.reception_opens || entry.reception_closes))
      .map((entry) => range(entry.reception_opens, entry.reception_closes)),
  );
}

export default function OpeningHoursTimetable({
  openingHours,
  isPharmacy,
}: {
  openingHours: OpeningHours;
  isPharmacy: boolean;
}) {
  const today = todayInJapan();

  return (
    <div className="mt-3 space-y-6">
      {openingHours.schedules.length === 0 ? (
        <p className="text-sm text-muted">時刻は公開されていません。</p>
      ) : (
        openingHours.schedules.map((schedule) => (
          <ScheduleTable
            key={schedule.departments.join("・") || "all"}
            schedule={schedule}
            today={today}
            // A pharmacy's one schedule has no departments; the section heading says it all.
            caption={schedule.departments.length > 0 ? schedule.departments.join("・") : null}
          />
        ))
      )}

      {openingHours.closures && (
        <ClosureSummary closures={openingHours.closures} label={isPharmacy ? "定休日" : "休診日"} />
      )}

      <p className="text-sm leading-relaxed text-muted">
        ※ 厚生労働省「医療情報ネット」の{formatDate(openingHours.published_on)}
        時点の情報です（年2回更新）。臨時の{isPharmacy ? "休業" : "休診"}
        や最近の変更は含まれないため、お出かけの前に{isPharmacy ? "薬局" : "医療機関"}
        へご確認ください。名称と所在地で同じ施設を探して表示しています。
      </p>
    </div>
  );
}

function ScheduleTable({
  schedule,
  today,
  caption,
}: {
  schedule: OpeningHoursSchedule;
  today: ScheduleDay;
  caption: string | null;
}) {
  const hours = Object.fromEntries(days.map(({ day }) => [day, hoursOn(schedule, day)])) as Record<
    ScheduleDay,
    (string | null)[]
  >;
  const reception = Object.fromEntries(days.map(({ day }) => [day, receptionOn(schedule, day)])) as Record<
    ScheduleDay,
    string[]
  >;
  const hasReception = days.some(({ day }) => reception[day].length > 0);
  const isOff = (day: ScheduleDay) => hours[day].every((value) => value === null);
  const todayClass = (day: ScheduleDay) => (day === today ? "bg-band font-bold" : "");

  return (
    <div>
      {caption && <h3 className="text-sm font-bold">{caption}</h3>}

      {/* Wide screens: slots × days, each time range on one line (eight of them only fit from lg). */}
      <div className={`hidden overflow-x-auto lg:block ${caption ? "mt-2" : ""}`}>
        <table className="data-table table-fixed text-center [&_td]:px-1.5 [&_th]:px-1.5">
          <thead>
            <tr>
              <th className="w-20">
                <span className="sr-only">時間帯</span>
              </th>
              {days.map(({ day, label }) => (
                <th
                  key={day}
                  scope="col"
                  className={day === today ? "bg-band! text-accent!" : ""}
                >
                  {label}
                  {day === today && <span className="ml-1 text-sm font-normal">今日</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.slots.map((slot, slotIndex) => (
              <tr key={slot.number}>
                <th scope="row" className="text-center! text-sm text-muted">
                  時間帯{slotIndex + 1}
                </th>
                {days.map(({ day }) => {
                  if (isOff(day)) {
                    // One cell down the whole column for a day with no hours.
                    return slotIndex === 0 ? (
                      <td
                        key={day}
                        rowSpan={schedule.slots.length}
                        className={`align-middle! text-center text-muted ${todayClass(day)}`}
                      >
                        休
                      </td>
                    ) : null;
                  }
                  const value = hours[day][slotIndex];
                  return (
                    <td key={day} className={`whitespace-nowrap ${value ? "" : "text-center"} ${todayClass(day)}`}>
                      {value ? <TimeRange value={value} /> : <span className="text-muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {hasReception && (
              <tr>
                <th scope="row" className="text-center! text-sm text-muted">
                  受付
                </th>
                {days.map(({ day }) => (
                  <td
                    key={day}
                    className={`whitespace-nowrap ${reception[day].length > 0 ? "" : "text-center"} ${todayClass(day)}`}
                  >
                    {reception[day].length > 0 ? (
                      reception[day].map((value) => <TimeRange key={value} value={value} />)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Phones and tablets: one line per day. */}
      <dl className={`divide-y divide-border border border-border lg:hidden ${caption ? "mt-2" : ""}`}>
        {days.map(({ day, label }) => (
          <div key={day} className={`flex gap-3 px-3 py-2 ${day === today ? "bg-band" : ""}`}>
            <dt className="w-10 shrink-0 font-bold">
              {label}
              {day === today && <span className="block text-sm font-normal text-accent">今日</span>}
            </dt>
            <dd className="min-w-0 flex-1">
              {isOff(day) ? (
                <span className="text-muted">休</span>
              ) : (
                <span>{hours[day].filter((value) => value !== null).join(" / ")}</span>
              )}
              {reception[day].length > 0 && (
                <span className="block text-sm text-muted">受付 {reception[day].join(" / ")}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TimeRange({ value }: { value: string }) {
  return <span className="block whitespace-nowrap">{value}</span>;
}

function ClosureSummary({ closures, label }: { closures: Closures; label: string }) {
  const parts = [
    closures.weekly.length > 0 && `毎週${closures.weekly.map((day) => dayLabels[day]).join("・")}曜`,
    ...closures.monthly.map(({ week, day }) => `第${week}${dayLabels[day]}曜`),
    closures.holidays === true && "祝日",
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0 && !closures.other) {
    return null;
  }

  return (
    <dl>
      <div className="flex gap-3">
        <dt className="shrink-0 font-bold">{label}</dt>
        <dd>
          {parts.length > 0 ? parts.join("、") : "—"}
          {closures.other && (
            <span className="mt-1 block whitespace-pre-line text-muted">その他：{closures.other}</span>
          )}
        </dd>
      </div>
    </dl>
  );
}
