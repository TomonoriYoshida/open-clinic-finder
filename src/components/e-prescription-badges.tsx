import type { MedicalFacility } from "@/lib/api/types";

/**
 * Whether the facility takes electronic prescriptions (and refill ones), from
 * the MHLW list. Nothing is shown for a facility not on the list.
 */
export default function EPrescriptionBadges({
  ePrescription,
  className = "",
}: {
  ePrescription: MedicalFacility["e_prescription"];
  className?: string;
}) {
  if (!ePrescription) {
    return null;
  }
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`}>
      <li className="rounded-full border border-control-border px-2 py-0.5 text-sm">電子処方箋に対応</li>
      {ePrescription.refill_started_on && (
        <li className="rounded-full border border-control-border px-2 py-0.5 text-sm">リフィル処方箋に対応</li>
      )}
    </ul>
  );
}
