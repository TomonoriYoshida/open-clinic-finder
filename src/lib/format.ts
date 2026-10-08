export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export const numberFormatter = new Intl.NumberFormat("ja-JP");

/** "350m", "1.2km", "2km". */
export function formatDistance(meters: number): string {
  // Round first, so 997m reads "1km" rather than "1000m".
  const rounded = Math.round(meters / 10) * 10;
  return rounded < 1000 ? `${rounded}m` : `${(rounded / 1000).toFixed(1).replace(/\.0$/, "")}km`;
}
