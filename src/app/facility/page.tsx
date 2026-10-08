import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/query-state";
import FacilityDetail from "./facility-detail";

export const metadata: Metadata = {
  title: "施設の詳細",
};

// A static export can't prerender ~220k /facility/[id] pages, so the id is a
// query parameter and the page fetches the facility in the browser.
export default function FacilityPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FacilityDetail />
    </Suspense>
  );
}
