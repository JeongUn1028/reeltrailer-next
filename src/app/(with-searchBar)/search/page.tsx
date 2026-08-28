import SearchResults from "@/app/components/search/searchList";
import { Suspense } from "react";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
