import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/query-state";
import { ogImage, siteDescription, siteName } from "@/lib/site";
import Finder from "./finder";

// The whole openGraph is repeated: a page's openGraph replaces the layout's.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
    locale: "ja_JP",
    images: [ogImage],
  },
};

export default function Home() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Finder />
    </Suspense>
  );
}
