export const siteName = "いま開いてる病院・薬局";

export const siteDescription =
  "現在地や駅名から、いま開いている近くの病院・診療所・歯科・薬局を探せます。診療時間は厚生労働省「医療情報ネット」の情報です。";

/** InstitutionType (App\Enums\InstitutionType) codes. */
export const institutionTypes = {
  hospital: 1,
  clinic: 2,
  dental: 3,
  pharmacy: 4,
} as const;

/** MedicalFacilityStatus::Active: closed facilities aren't worth finding nearby. */
export const activeStatus = 1;
