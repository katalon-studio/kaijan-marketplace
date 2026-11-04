// URL-valued metadata screening shared by source capture consumers.
import { createHash } from "node:crypto";
import { URL } from "node:url";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const sensitiveQueryKeys = new Set([
  "token",
  "access_token",
  "api_key",
  "apikey",
  "authorization",
  "jwt",
  "signature",
  "x-amz-signature",
  "x-amz-credential",
]);

// For URL-valued captured metadata, not a universal scanner of code or logs.
export function sanitizeMetadataUrls(metadata) {
  const redactions = [];
  const visit = (value, pointer = "") => {
    if (Array.isArray(value))
      return value.map((v, i) => visit(v, `${pointer}/${i}`));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          visit(
            v,
            `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          ),
        ]),
      );
    }
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      let url;
      try {
        url = new URL(value.trim());
      } catch {
        return value;
      }
      const keys = [...url.searchParams.keys()].filter((key) =>
        sensitiveQueryKeys.has(key.toLowerCase()),
      );
      const hasUserinfo = Boolean(url.username || url.password);
      if (keys.length || hasUserinfo) {
        redactions.push({
          pointer,
          queryKeys: keys,
          hasUserinfo,
          originalValueSha256: hash(value),
        });
        return "[REDACTED_CREDENTIAL_BEARING_URL]";
      }
    }
    return value;
  };
  return { metadata: visit(metadata), redactions };
}
