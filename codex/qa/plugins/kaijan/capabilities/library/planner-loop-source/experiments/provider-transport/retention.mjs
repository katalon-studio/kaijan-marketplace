// Product inference always uses stateless responses and ZDR provider routing.
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
