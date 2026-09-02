import SearchResults from "@/app/components/search/searchList";
import ProgramsSkeleton from "@/app/components/skeleton/programs-skeleton";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import providerIds from "@/config/ott-provider-ids.json";

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<{ q: string }>;
  params: Promise<{ ott: string }>;
}) {
  const { ott } = await params;
  if (!providerIds[ott as keyof typeof providerIds]) {
    notFound();
  }
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <SearchResults searchParams={searchParams} params={params} />
    </Suspense>
  );
}
