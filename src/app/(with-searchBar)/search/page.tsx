import SearchResults from "@/app/components/search/searchList";
import ProgramsSkeleton from "@/app/components/skeleton/programs-skeleton";
import { Suspense } from "react";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
