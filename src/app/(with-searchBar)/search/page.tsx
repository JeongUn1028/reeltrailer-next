import Programs from "@/app/components/programs";

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  console.log("Search Query from Params:", q);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/search?q=${q}`,
  );
  if (!response.ok) {
    console.error("Search API request failed with status:", response.status);
    throw new Error(`search API 요청 실패`);
  }
  const { programs } = await response.json();
  return (
    <>
      <Programs programs={programs} />
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div>
      <SearchResults searchParams={searchParams} />
    </div>
  );
}
