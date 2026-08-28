export function normalizeProviderName(providerName: string) {
  const normalizedName = providerName.trim().toLowerCase();

  if (
    normalizedName === "netflix" ||
    normalizedName === "netflix standard with ads"
  ) {
    return "Netflix";
  }

  return providerName;
}
