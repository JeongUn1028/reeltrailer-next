import SearchResults from "@/app/components/search/search-list";
import ProgramsSkeleton from "@/app/components/programs/programs-skeleton";
import { Suspense } from "react";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
}) {
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
