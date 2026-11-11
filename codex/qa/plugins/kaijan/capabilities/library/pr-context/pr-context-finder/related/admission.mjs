import { sourceItemKey, hash } from "./records.mjs";
import { retrievalProfile, retrievalScore } from "./retrieval.mjs";

const channels = ["timeline", "literal_reference", "recent", "search"];
const empty = () => ({
  fetched: 0,
  quarantined: 0,
  seed_excluded: 0,
  eligible_unique: 0,
  admitted: 0,
  dropped: 0,
  identity_quarantined: 0,
});

// This is pool admission, not a semantic relevance judgment. Scores never create a relation label.
export function candidateAdmission(
  seed,
  repositories,
  limit,
  profile = retrievalProfile(seed),
  scoreItem = (item) => retrievalScore(profile, item),
) {
  const seedKey = sourceItemKey(seed);
  const pool = new Map(),
    seen = new Map(),
    blocked = new Set();
  const counts = new Map(
    repositories.map((repo) => [
      repo,
      Object.fromEntries(channels.map((channel) => [channel, empty()])),
    ]),
  );
  const stats = (repo, channel) => counts.get(repo.toLowerCase())[channel];
  function score(item) {
    return scoreItem(item);
  }
  function compare(a, b) {
    return (
      Number(b.direct_links.length > 0) - Number(a.direct_links.length > 0) ||
      b.admission_score - a.admission_score ||
      Number(b.channels.includes("search")) -
        Number(a.channels.includes("search")) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    );
  }
  function observe(item, channel, link) {
    const row = stats(item.repo, channel);
    if (item.key === seedKey) {
      row.seed_excluded++;
      return;
    }
    let identity = seen.get(item.key);
    if (!identity) {
      identity = {
        key: item.key,
        repo: item.repo,
        number: item.number,
        url: item.url,
        channels: new Set(),
        links: new Map(),
      };
      seen.set(item.key, identity);
    }
    identity.channels.add(channel);
    if (blocked.has(item.key)) return;
    if (link) identity.links.set(JSON.stringify(link), link);
    const existing = pool.get(item.key);
    // Stable duplicate representation for stable source observations, independent of repository order.
    let source = item;
    if (
      existing &&
      (existing.updated_at > item.updated_at ||
        (existing.updated_at === item.updated_at &&
          hash(existing.title + "\n" + existing.body) <
            hash(item.title + "\n" + item.body)))
    )
      source = existing;
    const value = {
      ...source,
      channels: [...identity.channels].sort(),
      direct_links: [...identity.links]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([, link]) => link),
      admission_score: score(source),
    };
    if (existing || pool.size < limit) {
      pool.set(item.key, value);
      return;
    }
    const worst = [...pool.values()].sort(compare).at(-1);
    if (compare(value, worst) < 0) {
      pool.delete(worst.key);
      pool.set(item.key, value);
    }
  }
  function summary() {
    const result = new Map(
      [...counts].map(([repo, values]) => [
        repo,
        Object.fromEntries(channels.map((c) => [c, { ...values[c] }])),
      ]),
    );
    const dropped = [];
    for (const identity of [...seen.values()].sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    )) {
      for (const channel of [...identity.channels].sort()) {
        const row = result.get(identity.repo)[channel];
        row.eligible_unique++;
        if (pool.has(identity.key)) row.admitted++;
        else {
          row.dropped++;
          if (blocked.has(identity.key)) row.identity_quarantined++;
          dropped.push({
            key: identity.key,
            repo: identity.repo,
            number: identity.number,
            channel,
            source_uri: identity.url,
            reason: blocked.has(identity.key)
              ? "authored_intake_quarantine"
              : "global_candidate_limit",
            admission_reason: blocked.has(identity.key)
              ? "identity_quarantined_in_another_observation"
              : "lower_direct_concept_search_priority",
          });
        }
      }
    }
    return { counts: result, dropped };
  }
  return {
    pool,
    observe,
    quarantine(key) {
      blocked.add(key);
      pool.delete(key);
    },
    fetched(repo, channel, n) {
      stats(repo, channel).fetched += n;
    },
    quarantined(repo, channel, n) {
      stats(repo, channel).quarantined += n;
    },
    summary,
  };
}
