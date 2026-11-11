// Lexical navigation only; no corpus, vocabulary exclusions or semantic labels.
import { wordSegments } from "../core.mjs";
const order = (a, b) =>
  b.weight - a.weight ||
  a.position - b.position ||
  (a.text < b.text ? -1 : a.text > b.text ? 1 : 0);

function words(text) {
  return wordSegments(text).map((row) => ({
    ...row,
    text: row.text.toLowerCase(),
    identifier:
      /^\p{Lu}[\p{Lu}\p{N}]+$/u.test(row.text) ||
      /\p{Ll}\p{Lu}|_|\p{N}/u.test(row.text),
  }));
}

export function retrievalProfile(seed) {
  const terms = new Map(),
    phrases = new Map();
  const fields = [
    [String(seed.title ?? ""), 3, "title"],
    [String(seed.body ?? ""), 1, "body"],
  ];
  for (const [text, weight, field] of fields) {
    const rows = words(text);
    for (let n = 0; n < rows.length; n++) {
      const row = rows[n];
      const value = weight + (row.identifier ? 5 : 0);
      const previous = terms.get(row.text);
      if (!previous || previous.weight < value)
        terms.set(row.text, {
          text: row.text,
          weight: value,
          position: (field === "title" ? 0 : 1000000) + row.position,
          field,
          identifier: row.identifier,
        });
      const next = rows[n + 1];
      // Adjacent original words only; punctuation is not invented whitespace.
      if (next && /^\s+$/.test(text.slice(row.end, next.position))) {
        const key = `${row.text} ${next.text}`;
        const value = {
          text: key,
          weight: weight + 2 + Number(row.identifier || next.identifier),
          position: (field === "title" ? 0 : 1000000) + row.position,
          field,
        };
        if (!phrases.has(key) || phrases.get(key).weight < value.weight)
          phrases.set(key, value);
      }
    }
  }
  const keptTerms = [...terms.values()].sort(order).slice(0, 48);
  const keptPhrases = [...phrases.values()].sort(order).slice(0, 12);
  const identifiers = keptTerms.filter((r) => r.identifier).slice(0, 3);
  const concepts = keptPhrases.length
    ? keptPhrases
    : keptTerms.filter((r) => !r.identifier);
  const groups = [];
  if (identifiers.length) groups.push(identifiers.map((r) => r.text));
  const distinct = concepts.filter(
    (r) => !identifiers.some((i) => i.text === r.text),
  );
  if (distinct.length)
    groups.push(
      distinct.slice(0, identifiers.length ? 3 : 2).map((r) => r.text),
    );
  // With no identifiers use two separate alternatives windows, not a six-word AND.
  if (!identifiers.length && distinct.length > 2)
    groups.push(distinct.slice(2, 4).map((r) => r.text));
  return {
    method: "seed-lexical/2",
    terms: keptTerms,
    phrases: keptPhrases,
    groups: groups.slice(0, 2),
    lexical_coverage: {
      status: terms.size ? "bounded" : "unassessed",
      reason: terms.size
        ? "finite_lexical_selection"
        : "no_runtime_word_segments",
      segmentation:
        "Intl.Segmenter/word; runtime ICU boundaries; not language understanding",
      unique_terms: terms.size,
      unique_phrases: phrases.size,
      grouped_keys: new Set(groups.flat()).size,
      ungrouped_retained_keys: [...keptTerms, ...keptPhrases].filter(
        (row) => !groups.flat().includes(row.text),
      ).length,
      semantic_coverage: "unassessed",
    },
    omitted_terms: Math.max(0, terms.size - keptTerms.length),
    omitted_phrases: Math.max(0, phrases.size - keptPhrases.length),
  };
}

export function retrievalQueryPlan(profile, repositories) {
  // Explicit authority windows plus at most three alternatives stay within the
  // five-Boolean-operator platform contract. All requests share the caller budget.
  const sorted = [...repositories].sort();
  const scopes = Array.from({ length: Math.ceil(sorted.length / 4) }, (_, n) =>
    sorted.slice(n * 4, n * 4 + 4),
  );
  const queries = [];
  let omitted = 0;
  if (profile.groups.length && scopes.length) {
    for (const group of profile.groups) {
      for (const scope of scopes) {
        const selected = [];
        for (const term of group) {
          const quoted = JSON.stringify(term);
          // Local finite query budget, including escaping, quotes and OR syntax.
          if ([...`(${[...selected, quoted].join(" OR ")})`].length <= 240)
            selected.push(quoted);
          else omitted++;
        }
        if (!selected.length) continue;
        const query = `(${scope.map((r) => `repo:${r}`).join(" OR ")}) in:title,body (${selected.join(" OR ")})`;
        queries.push(query + " is:issue", query + " is:pull-request");
      }
    }
  }
  return {
    queries,
    coverage: {
      status: queries.length ? (omitted ? "partial" : "bounded") : "unassessed",
      reason: queries.length
        ? "finite_query_selection"
        : profile.groups.length
          ? "query_capacity_or_empty_repository_scope"
          : "no_selected_lexical_keys",
      query_character_budget: 240,
      omitted_group_occurrences: omitted,
      semantic_coverage: "unassessed",
    },
  };
}

export function retrievalQueries(profile, repositories) {
  return retrievalQueryPlan(profile, repositories).queries;
}

export function retrievalScore(profile, item) {
  if (
    ["source-intent/1", "intent-search/1", "intent-search/2"].includes(
      profile.method,
    )
  ) {
    const title = String(item.title ?? "").toLowerCase();
    const body = String(item.body ?? "").toLowerCase();
    return profile.terms.reduce(
      (n, row) =>
        n +
        row.weight *
          (4 * Number(title.includes(row.text.toLowerCase())) +
            Number(body.includes(row.text.toLowerCase()))),
      0,
    );
  }
  const title = words(item.title),
    body = words(item.body);
  const titleTerms = new Set(title.map((r) => r.text)),
    bodyTerms = new Set(body.map((r) => r.text));
  function pairs(rows, source) {
    const found = new Set();
    for (let n = 0; n < rows.length - 1; n++)
      if (
        /^\s+$/.test(
          String(source ?? "").slice(rows[n].end, rows[n + 1].position),
        )
      )
        found.add(`${rows[n].text} ${rows[n + 1].text}`);
    return found;
  }
  const titlePhrases = pairs(title, item.title),
    bodyPhrases = pairs(body, item.body);
  let score = 0;
  for (const term of profile.terms)
    score +=
      term.weight *
      (4 * Number(titleTerms.has(term.text)) +
        Number(bodyTerms.has(term.text)));
  for (const phrase of profile.phrases)
    score +=
      phrase.weight *
      (4 * Number(titlePhrases.has(phrase.text)) +
        Number(bodyPhrases.has(phrase.text)));
  return score;
}
