// json.loads(bytes) detects UTF-8/16/32 and decodes with surrogatepass.
// Explicit UTF-8 entry points retain a leading BOM and reject surrogates.
function decodingError(bytes, encoding, start, end, reason) {
  const range =
    end === start + 1
      ? `byte 0x${bytes[start].toString(16).padStart(2, "0")} in position ${start}`
      : `bytes in position ${start}-${end - 1}`;
  const error = new Error(
    `'${encoding}' codec can't decode ${range}: ${reason}`,
  );
  error.name = "UnicodeDecodeError";
  throw error;
}
function utf8Text(bytes, surrogatepass) {
  let result = "";
  for (let i = 0; i < bytes.length;) {
    const start = i,
      first = bytes[i++];
    if (first < 0x80) {
      result += String.fromCharCode(first);
      continue;
    }
    const count =
      first >= 0xc2 && first <= 0xdf
        ? 1
        : first >= 0xe0 && first <= 0xef
          ? 2
          : first >= 0xf0 && first <= 0xf4
            ? 3
            : -1;
    if (count < 0)
      decodingError(bytes, "utf-8", start, i, "invalid start byte");
    // surrogatepass handles only a complete surrogate sequence; malformed
    // sequences retain the strict decoder's original error span and reason.
    if (
      surrogatepass &&
      first === 0xed &&
      bytes[i] >= 0xa0 &&
      bytes[i] <= 0xbf &&
      bytes[i + 1] >= 0x80 &&
      bytes[i + 1] <= 0xbf
    ) {
      result += String.fromCharCode(
        ((first & 15) << 12) | ((bytes[i] & 63) << 6) | (bytes[i + 1] & 63),
      );
      i += 2;
      continue;
    }
    let cp = first & (0x7f >> (count + 1));
    for (let k = 0; k < count; k++) {
      if (i === bytes.length)
        decodingError(bytes, "utf-8", start, i, "unexpected end of data");
      const next = bytes[i];
      const min =
        k === 0 && first === 0xe0
          ? 0xa0
          : k === 0 && first === 0xf0
            ? 0x90
            : 0x80;
      const max =
        k === 0 && first === 0xed
          ? 0x9f
          : k === 0 && first === 0xf4
            ? 0x8f
            : 0xbf;
      if (next < min || next > max)
        decodingError(bytes, "utf-8", start, i, "invalid continuation byte");
      i++;
      cp = cp * 64 + (next & 0x3f);
    }
    result += String.fromCodePoint(cp);
  }
  return result;
}
export function text(raw) {
  return utf8Text(Buffer.from(raw), false);
}
export function jsonText(raw) {
  const original = Buffer.from(raw);
  let bytes = original,
    unit = 1,
    little = false,
    offset = 0;
  if (bytes.subarray(0, 4).equals(Buffer.from([0xff, 0xfe, 0, 0]))) {
    unit = 4;
    little = true;
    offset = 4;
  } else if (bytes.subarray(0, 4).equals(Buffer.from([0, 0, 0xfe, 0xff]))) {
    unit = 4;
    offset = 4;
  } else if (bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) {
    unit = 2;
    little = true;
    offset = 2;
  } else if (bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) {
    unit = 2;
    offset = 2;
  } else if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    return utf8Text(bytes.subarray(3), true);
  } else if (bytes.length >= 4) {
    if (bytes[0] === 0) unit = bytes[1] === 0 ? 4 : 2;
    else if (bytes[1] === 0) {
      little = true;
      unit = bytes[2] === 0 && bytes[3] === 0 ? 4 : 2;
    }
  } else if (bytes.length >= 2) {
    if (bytes[0] === 0) unit = 2;
    else if (bytes[1] === 0) {
      unit = 2;
      little = true;
    }
  }
  if (unit === 1) return utf8Text(bytes, true);
  bytes = bytes.subarray(offset);
  const encoding = `utf-${unit * 8}-${little ? "le" : "be"}`;
  let result = "";
  for (let i = 0; i < bytes.length; i += unit) {
    if (i + unit > bytes.length)
      decodingError(
        original,
        encoding,
        i + offset,
        original.length,
        "truncated data",
      );
    const cp =
      unit === 2
        ? little
          ? bytes.readUInt16LE(i)
          : bytes.readUInt16BE(i)
        : little
          ? bytes.readUInt32LE(i)
          : bytes.readUInt32BE(i);
    if (cp > 0x10ffff)
      decodingError(
        original,
        encoding,
        i + offset,
        i + offset + unit,
        "code point not in range(0x110000)",
      );
    result += String.fromCodePoint(cp);
  }
  return result;
}
