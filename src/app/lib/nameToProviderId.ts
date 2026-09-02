import providerIds from "../../config/ott-provider-ids.json";

export const nameToProviderId = (ott: string) => {
  const providerId = providerIds[ott as keyof typeof providerIds];
  return Number(providerId);
};
