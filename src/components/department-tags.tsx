import type { CodeLabel } from "@/lib/api/types";

type Props = {
  departments: CodeLabel[];
  /** Show at most this many, then a "他N科" count. */
  max?: number;
  className?: string;
};

export default function DepartmentTags({ departments, max, className = "" }: Props) {
  if (departments.length === 0) {
    return null;
  }
  const shown = max === undefined ? departments : departments.slice(0, max);
  const hiddenCount = departments.length - shown.length;

  return (
    <ul className={`flex flex-wrap gap-1 ${className}`}>
      {shown.map((department) => (
        <li key={department.code} className="bg-band px-2 py-0.5 text-sm text-accent">
          {department.label}
        </li>
      ))}
      {hiddenCount > 0 && <li className="px-1 py-0.5 text-sm text-muted">他{hiddenCount}科</li>}
    </ul>
  );
}
