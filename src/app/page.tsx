import { Suspense } from "react";
import { LoadingState } from "@/components/query-state";
import Finder from "./finder";

export default function Home() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Finder />
    </Suspense>
  );
}
