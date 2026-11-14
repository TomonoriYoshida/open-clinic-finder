import { useEffect, useState } from "react";

const japanParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-08T19:05" in Japan, whatever the visitor's own time zone. */
export function japanLocalTime(date: Date): string {
  const parts = Object.fromEntries(japanParts.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * The current minute, refreshed every few minutes so "いま開いている"
 * stays true while the page is left open without refetching every second.
 */
export function useCurrentMinute(refreshMinutes = 5): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date(Math.floor(Date.now() / 60000) * 60000));
    update();
    const timer = window.setInterval(update, refreshMinutes * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refreshMinutes]);

  return now;
}

/** Days from the Japan-local date of `searchedAt` to that of an ISO time in Japan. */
function daysAfter(isoTime: string, searchedAt: string): number {
  return Math.round(
    (Date.parse(`${isoTime.slice(0, 10)}T00:00:00Z`) - Date.parse(`${searchedAt.slice(0, 10)}T00:00:00Z`)) / 86400000,
  );
}

/**
 * How an ISO time in Japan from the API reads against the day searched:
 * "9:00", or "翌0:05" on the next day.
 */
export function formatTimeAfter(isoTime: string, searchedAt: string): string {
  return `${daysAfter(isoTime, searchedAt) >= 1 ? "翌" : ""}${Number(isoTime.slice(11, 13))}:${isoTime.slice(14, 16)}`;
}

/**
 * How `open_until` (an ISO time in Japan, e.g. 2026-10-09T02:00:00+09:00)
 * reads against the day searched: "19:00まで", "24:00まで" or "翌2:00まで".
 */
export function formatOpenUntil(openUntil: string, searchedAt: string): string {
  if (daysAfter(openUntil, searchedAt) === 1 && openUntil.slice(11, 16) === "00:00") {
    return "24:00まで";
  }
  return `${formatTimeAfter(openUntil, searchedAt)}まで`;
}

/** The ISO time in Japan of a Japan-local "YYYY-MM-DDTHH:mm". */
export function japanIsoTime(localTime: string): string {
  return `${localTime.slice(0, 16)}:00+09:00`;
}

/** "10月8日(木) 19:05" for a Japan-local "YYYY-MM-DDTHH:mm". */
export function formatJapanLocalTime(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  const weekday = "日月火水木金土"[date.getUTCDay()];
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日(${weekday}) ${Number(value.slice(11, 13))}:${value.slice(14, 16)}`;
}

/** "10/8(木) 19:05" for a Japan-local "YYYY-MM-DDTHH:mm", short enough for a button. */
export function formatJapanLocalTimeShort(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  const weekday = "日月火水木金土"[date.getUTCDay()];
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${weekday}) ${Number(value.slice(11, 13))}:${value.slice(14, 16)}`;
}

/** Whole minutes from one ISO time to a later one. */
export function minutesBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 60000);
}

/** "25分", "1時間", "4時間4分". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)}時間${rest === 0 ? "" : `${rest}分`}`;
}
