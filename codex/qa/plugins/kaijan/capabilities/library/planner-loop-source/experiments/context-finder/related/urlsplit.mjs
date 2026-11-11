// Compatibility translation of the pinned CPython urllib.parse URL boundary.
// Python3.9.6 is PCF's existing default; shared capture explicitly binds3.12.14.
// This validates URL structure only. The caller's canonical detector is unchanged.
export const URL_PARSER_BASELINES = ["python3.9.6", "python3.12.14"];
const invalid = () => {
  throw Error("Invalid IPv6 URL");
};
function ipv4Suffix(value) {
  const octets = value.split(".");
  if (octets.length !== 4) invalid();
  const numbers = octets.map((part) => {
    if (
      !/^[0-9]{1,3}$/.test(part) ||
      (part.length > 1 && part[0] === "0") ||
      Number(part) > 255
    )
      invalid();
    return Number(part);
  });
  return [
    (numbers[0] * 256 + numbers[1]).toString(16),
    (numbers[2] * 256 + numbers[3]).toString(16),
  ];
}
function ipv6Host(value) {
  // IPv6Address._split_scope_id followed by _ip_int_from_string/_parse_hextet.
  const percent = value.indexOf("%");
  let address = value;
  if (percent >= 0) {
    const scope = value.slice(percent + 1);
    if (!scope || scope.includes("%")) invalid();
    address = value.slice(0, percent);
  }
  if (!address || address.length > 45) invalid();
  let parts = address.split(":");
  if (parts.length < 3) invalid();
  if (parts.at(-1).includes("."))
    parts = [...parts.slice(0, -1), ...ipv4Suffix(parts.at(-1))];
  if (parts.length > 9) invalid();
  let skip = null;
  for (let i = 1; i < parts.length - 1; i++)
    if (parts[i] === "") {
      if (skip !== null) invalid();
      skip = i;
    }
  let high, low;
  if (skip !== null) {
    high = skip;
    low = parts.length - skip - 1;
    if (parts[0] === "") {
      high--;
      if (high) invalid();
    }
    if (parts.at(-1) === "") {
      low--;
      if (low) invalid();
    }
    if (8 - (high + low) < 1) invalid();
  } else {
    if (parts.length !== 8 || !parts[0] || !parts.at(-1)) invalid();
    high = parts.length;
    low = 0;
  }
  for (const part of [
    ...parts.slice(0, high),
    ...(low ? parts.slice(-low) : []),
  ])
    if (!/^[0-9A-Fa-f]{1,4}$/.test(part)) invalid();
}
function bracketedNetloc(netloc) {
  // urllib.parse._check_bracketed_netloc/_check_bracketed_host,3.12.14.
  const hostPort = netloc.slice(netloc.lastIndexOf("@") + 1),
    open = hostPort.indexOf("[");
  let hostname;
  if (open >= 0) {
    if (open !== 0) invalid();
    const bracketed = hostPort.slice(open + 1),
      close = bracketed.indexOf("]");
    hostname = close < 0 ? bracketed : bracketed.slice(0, close);
    const port = close < 0 ? "" : bracketed.slice(close + 1);
    if (port && !port.startsWith(":")) invalid();
  } else hostname = hostPort.split(":", 1)[0];
  if (hostname.startsWith("v")) {
    if (!/^v[a-fA-F0-9]+\..+$/s.test(hostname) || hostname.includes("\n"))
      invalid();
  } else ipv6Host(hostname);
}
export function urlsplit(value, { baseline = "python3.9.6" } = {}) {
  if (!URL_PARSER_BASELINES.includes(baseline))
    throw Error("source_url_parser_baseline");
  let url = (
      baseline === "python3.12.14" ? value.replace(/^[\0-\x20]+/, "") : value
    ).replace(/[\t\r\n]/g, ""),
    scheme = "",
    netloc = "",
    fragment = "",
    query = "";
  const found = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(url);
  if (found) {
    scheme = found[1].toLowerCase();
    url = url.slice(found[0].length);
  }
  if (url.startsWith("//")) {
    url = url.slice(2);
    const end = url.search(/[/?#]/);
    netloc = end < 0 ? url : url.slice(0, end);
    url = end < 0 ? "" : url.slice(end);
    if (netloc.includes("[") !== netloc.includes("]")) invalid();
    if (
      baseline === "python3.12.14" &&
      netloc.includes("[") &&
      netloc.includes("]")
    )
      bracketedNetloc(netloc);
    if (/[^\0-\x7f]/.test(netloc)) {
      const check = netloc.replace(/[@:#?]/g, "");
      const normalized = check.normalize("NFKC");
      if (check !== normalized && /[/?#@:]/.test(normalized))
        throw Error(
          "netloc contains invalid characters under NFKC normalization",
        );
    }
  }
  let index = url.indexOf("#");
  if (index >= 0) {
    fragment = url.slice(index + 1);
    url = url.slice(0, index);
  }
  index = url.indexOf("?");
  if (index >= 0) {
    query = url.slice(index + 1);
    url = url.slice(0, index);
  }
  return { scheme, netloc, path: url, query, fragment };
}
