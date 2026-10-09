/**
 * The public origin, for absolute URLs in link previews (Facebook, LINE, X
 * need them). Set SITE_URL at build time when the site moves to a domain.
 */
export const siteUrl = (process.env.SITE_URL || "https://168-110-42-30.sslip.io").replace(/\/+$/, "");

export const siteName = "いま開いてる病院・薬局";

export const siteDescription =
  "現在地や駅名から、いま開いている近くの病院・診療所・歯科・薬局を探せます。診療時間は厚生労働省「医療情報ネット」の情報です。";

/** The link preview image, rendered by src/app/og.png/route.tsx. */
export const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "いま開いてる病院・薬局 — 近くで、いま開いている病院・診療所・歯科・薬局を探せます",
};

/** InstitutionType (App\Enums\InstitutionType) codes. */
export const institutionTypes = {
  hospital: 1,
  clinic: 2,
  dental: 3,
  pharmacy: 4,
} as const;

/** MedicalFacilityStatus::Active: closed facilities aren't worth finding nearby. */
export const activeStatus = 1;
