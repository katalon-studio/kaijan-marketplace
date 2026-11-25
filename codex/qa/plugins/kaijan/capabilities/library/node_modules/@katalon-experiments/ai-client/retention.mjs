export const storeKaijanResponses = true;

// Explicit stateless compatibility for callers outside the current product flows.
// Account/project enrollment still belongs to the provider's policy owner.
export function zdrRequest(body, provider = "openai") {
  return {
    ...body,
    store: false,
    ...(body.background === true ? { background: false } : {}),
    ...(provider === "openrouter"
      ? {
          provider: {
            ...(body.provider ?? {}),
            zdr: true,
            data_collection: "deny",
          },
        }
      : {}),
  };
}
