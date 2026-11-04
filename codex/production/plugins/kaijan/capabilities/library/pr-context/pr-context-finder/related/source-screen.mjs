import { sanitize, secretsFromEnv } from "./source-sanitizer-api.mjs";
import { parseJson } from "./json.mjs";
import { check, RelatedError } from "./records.mjs";
const names = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "LOKI_OPENROUTER_API_KEY",
  "GH_TOKEN",
  "GITHUB_TOKEN",
];
export function sourceScreen(env, signal, additionalNames = []) {
  const selected = [
      ...new Set([
        ...names.filter((name) => Boolean(env[name])),
        ...additionalNames,
      ]),
    ],
    ownedEnv = { ...env };
  const apply = async (value, activeSignal) => {
    activeSignal?.throwIfAborted();
    const input = JSON.stringify(value);
    let changes;
    try {
      changes = sanitize(parseJson(input), {
        secrets: secretsFromEnv(ownedEnv, selected),
      })[1];
    } catch {
      throw new RelatedError(
        activeSignal?.aborted ? "stopped" : "source_screen_unavailable",
      );
    }
    check(!changes.length, "source_privacy");
    activeSignal?.throwIfAborted();
  };
  const screen = (value) => apply(value, signal);
  // Cancellation stops admission, while already observed bytes still need the same privacy policy.
  screen.preserve = (value) => apply(value, undefined);
  screen.declaration = {
    contract: "pcf-source-screen/2",
    credential_env_names: selected,
    policy: "exact-bound-values-and-URI-userinfo-password",
    unbound_credentials: "not_assessed",
  };
  return screen;
}
