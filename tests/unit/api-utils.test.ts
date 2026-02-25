import { describe, it, expect } from "bun:test";
import { sortBy, filterEngagement, dedupe, type Tweet } from "../../lib/api";

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: overrides.id ?? "1",
    text: overrides.text ?? "test tweet",
    author_id: overrides.author_id ?? "u1",
    username: overrides.username ?? "testuser",
    name: overrides.name ?? "Test User",
    created_at: overrides.created_at ?? "2026-02-25T12:00:00.000Z",
    conversation_id: overrides.conversation_id ?? "1",
    metrics: {
      likes: 0,
      retweets: 0,
      replies: 0,
      quotes: 0,
      impressions: 0,
      bookmarks: 0,
      ...overrides.metrics,
    },
    urls: overrides.urls ?? [],
    mentions: overrides.mentions ?? [],
    hashtags: overrides.hashtags ?? [],
    tweet_url: overrides.tweet_url ?? "https://x.com/testuser/status/1",
  };
}

describe("sortBy", () => {
  const tweets = [
    makeTweet({ id: "1", metrics: { likes: 10, retweets: 5, replies: 1, quotes: 0, impressions: 100, bookmarks: 0 } }),
    makeTweet({ id: "2", metrics: { likes: 50, retweets: 2, replies: 3, quotes: 1, impressions: 500, bookmarks: 2 } }),
    makeTweet({ id: "3", metrics: { likes: 5, retweets: 20, replies: 0, quotes: 0, impressions: 200, bookmarks: 1 } }),
  ];

  it("sorts by likes descending", () => {
    const sorted = sortBy(tweets, "likes");
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("3");
  });

  it("sorts by retweets descending", () => {
    const sorted = sortBy(tweets, "retweets");
    expect(sorted[0].id).toBe("3");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("2");
  });

  it("sorts by impressions descending", () => {
    const sorted = sortBy(tweets, "impressions");
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("1");
  });

  it("sorts by replies descending", () => {
    const sorted = sortBy(tweets, "replies");
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("3");
  });

  it("does not mutate the original array", () => {
    const original = [...tweets];
    sortBy(tweets, "likes");
    expect(tweets.map((t) => t.id)).toEqual(original.map((t) => t.id));
  });

  it("handles empty array", () => {
    expect(sortBy([], "likes")).toEqual([]);
  });

  it("handles single element", () => {
    const single = [makeTweet({ id: "solo" })];
    const sorted = sortBy(single, "likes");
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe("solo");
  });
});

describe("filterEngagement", () => {
  const tweets = [
    makeTweet({ id: "1", metrics: { likes: 5, retweets: 0, replies: 0, quotes: 0, impressions: 50, bookmarks: 0 } }),
    makeTweet({ id: "2", metrics: { likes: 15, retweets: 0, replies: 0, quotes: 0, impressions: 200, bookmarks: 0 } }),
    makeTweet({ id: "3", metrics: { likes: 100, retweets: 0, replies: 0, quotes: 0, impressions: 1000, bookmarks: 0 } }),
  ];

  it("filters by minimum likes", () => {
    const filtered = filterEngagement(tweets, { minLikes: 10 });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("filters by minimum impressions", () => {
    const filtered = filterEngagement(tweets, { minImpressions: 100 });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("filters by both likes and impressions", () => {
    const filtered = filterEngagement(tweets, { minLikes: 10, minImpressions: 500 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("3");
  });

  it("returns all when no filters specified", () => {
    const filtered = filterEngagement(tweets, {});
    expect(filtered).toHaveLength(3);
  });

  it("returns empty when nothing matches", () => {
    const filtered = filterEngagement(tweets, { minLikes: 1000 });
    expect(filtered).toHaveLength(0);
  });

  it("handles empty array", () => {
    expect(filterEngagement([], { minLikes: 1 })).toEqual([]);
  });
});

describe("dedupe", () => {
  it("removes duplicate tweets by id", () => {
    const tweets = [
      makeTweet({ id: "1", text: "first" }),
      makeTweet({ id: "2", text: "second" }),
      makeTweet({ id: "1", text: "first duplicate" }),
      makeTweet({ id: "3", text: "third" }),
      makeTweet({ id: "2", text: "second duplicate" }),
    ];
    const deduped = dedupe(tweets);
    expect(deduped).toHaveLength(3);
    expect(deduped.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps the first occurrence", () => {
    const tweets = [
      makeTweet({ id: "1", text: "original" }),
      makeTweet({ id: "1", text: "copy" }),
    ];
    const deduped = dedupe(tweets);
    expect(deduped[0].text).toBe("original");
  });

  it("handles empty array", () => {
    expect(dedupe([])).toEqual([]);
  });

  it("handles no duplicates", () => {
    const tweets = [makeTweet({ id: "1" }), makeTweet({ id: "2" }), makeTweet({ id: "3" })];
    expect(dedupe(tweets)).toHaveLength(3);
  });
});
