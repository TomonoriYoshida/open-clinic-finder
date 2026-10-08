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

/**
 * How `open_until` (an ISO time in Japan, e.g. 2026-10-09T02:00:00+09:00)
 * reads against the day searched: "19:00まで", "24:00まで" or "翌2:00まで".
 */
export function formatOpenUntil(openUntil: string, searchedAt: string): string {
  const days = Math.round(
    (Date.parse(`${openUntil.slice(0, 10)}T00:00:00Z`) - Date.parse(`${searchedAt.slice(0, 10)}T00:00:00Z`)) /
      86400000,
  );
  const hour = Number(openUntil.slice(11, 13));
  const minute = openUntil.slice(14, 16);

  if (days === 1 && hour === 0 && minute === "00") {
    return "24:00まで";
  }
  return `${days >= 1 ? "翌" : ""}${hour}:${minute}まで`;
}

/** Minutes from a Japan-local "YYYY-MM-DDTHH:mm" to an ISO time. */
export function minutesUntil(openUntil: string, searchedAt: string): number {
  return (Date.parse(openUntil) - Date.parse(`${searchedAt.slice(0, 16)}:00+09:00`)) / 60000;
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
