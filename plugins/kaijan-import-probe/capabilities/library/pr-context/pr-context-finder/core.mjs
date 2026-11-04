// Runtime Unicode word boundaries; no language vocabulary or source-context exclusions.
const segmenter = new Intl.Segmenter("und", { granularity: "word" });
export function wordSegments(text) {
  return Array.from(segmenter.segment(String(text ?? "")))
    .filter((row) => row.isWordLike)
    .map((row) => ({
      text: row.segment,
      position: row.index,
      end: row.index + row.segment.length,
    }));
}

export function tokens(text) {
  const out = [];
  for (const row of wordSegments(text)) {
    const key = row.text.toLowerCase();
    out.push(key);
    // Additional case/digit navigation keys never replace the whole word.
    for (const part of row.text.match(
      /\p{Lu}+(?=\p{Lu}\p{Ll}|$)|\p{Lu}?\p{Ll}+|\p{N}+/gu,
    ) ?? []) {
      if (part.toLowerCase() !== key) out.push(part.toLowerCase());
    }
  }
  return out;
}

export function buildIndex(records, cutoff) {
  const docs = records.filter((d) => d.created_at < cutoff);
  const posting = new Map(),
    lengths = [];
  docs.forEach((d, i) => {
    const counts = new Map();
    for (const term of tokens(`${d.title}\n${d.body ?? ""}`))
      counts.set(term, (counts.get(term) ?? 0) + 1);
    lengths.push([...counts.values()].reduce((a, b) => a + b, 0));
    for (const [term, count] of counts) {
      if (!posting.has(term)) posting.set(term, []);
      posting.get(term).push([i, count]);
    }
  });
  const average = lengths.reduce((a, b) => a + b, 0) / (docs.length || 1) || 1;
  const tfScore = (i, tf) =>
    (tf * 2.2) / (tf + 1.2 * (0.25 + (0.75 * lengths[i]) / average));
  const order = (scores) =>
    [...scores].sort(
      (a, b) => b[1] - a[1] || docs[b[0]].number - docs[a[0]].number,
    );
  return {
    docs,
    posting,
    rank(text, limit = 100) {
      const scores = new Map();
      for (const term of new Set(tokens(text))) {
        const hits = posting.get(term) ?? [];
        const idf = Math.log(
          1 + (docs.length - hits.length + 0.5) / (hits.length + 0.5),
        );
        for (const [i, tf] of hits)
          scores.set(i, (scores.get(i) ?? 0) + idf * tfScore(i, tf));
      }
      return order(scores)
        .slice(0, limit)
        .map(([i]) => docs[i]);
    },
  };
}

// Keep exact source substrings without splitting a UTF-16 surrogate pair.
export function sourceSlice(text, start, end) {
  start = Math.max(0, start);
  end = Math.min(text.length, end);
  const low = (i) =>
    text.charCodeAt(i) >= 0xdc00 && text.charCodeAt(i) <= 0xdfff;
  const high = (i) =>
    text.charCodeAt(i) >= 0xd800 && text.charCodeAt(i) <= 0xdbff;
  if (start > 0 && low(start) && high(start - 1)) start--;
  if (end > 0 && low(end) && high(end - 1)) end++;
  return text.slice(start, end);
}
