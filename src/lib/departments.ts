/**
 * Institution types (App\Enums\InstitutionType) whose departments can't narrow
 * a search: 薬局 has none, and 歯科診療所 are nearly all 歯科.
 */
const typesWithoutDepartmentFilter = ["3", "4"];

/** Whether a department filter makes sense for this institution_type value (from a URL or a form). */
export function hasDepartmentFilter(institutionType: string | null): boolean {
  return !typesWithoutDepartmentFilter.includes(institutionType ?? "");
}
