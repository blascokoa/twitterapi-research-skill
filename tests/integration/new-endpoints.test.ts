/**
 * Integration tests for new X API endpoints.
 * Requires TWITTERAPI_IO_KEY or TWITTERAPI_API_KEY env var.
 *
 * Run with: bun test tests/integration/new-endpoints.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  search,
  getTweetsByIds,
  getTweetReplies,
  getTweetQuotes,
  getVerifiedFollowers,
  getUserLastTweets,
  getUserMentions,
  getTrends,
  type Tweet,
} from "../../lib/api";

const hasToken = !!(process.env.TWITTERAPI_IO_KEY || process.env.TWITTERAPI_API_KEY);

// --- getTweetsByIds ---
describe.skipIf(!hasToken)("API Integration: getTweetsByIds", () => {
  let knownIds: string[];

  beforeAll(async () => {
    const tweets = await search("hello", { maxResults: 10 });
    expect(tweets.length).toBeGreaterThan(0);
    knownIds = tweets.slice(0, 3).map((t) => t.id);
  }, 30_000);

  it("fetches multiple tweets by IDs", async () => {
    const tweets = await getTweetsByIds(knownIds);
    expect(tweets.length).toBeGreaterThan(0);
    expect(tweets.length).toBeLessThanOrEqual(knownIds.length);

    for (const t of tweets) {
      expect(t.id).toBeTruthy();
      expect(t.text).toBeTruthy();
      expect(t.username).toBeTruthy();
      expect(t.metrics).toBeDefined();
      expect(typeof t.metrics.likes).toBe("number");
    }
  }, 30_000);

  it("returns empty array for empty input", async () => {
    const tweets = await getTweetsByIds([]);
    expect(tweets).toEqual([]);
  });

  it("handles single ID same as getTweet", async () => {
    const tweets = await getTweetsByIds([knownIds[0]]);
    expect(tweets.length).toBe(1);
    expect(tweets[0].id).toBe(knownIds[0]);
  }, 30_000);
});

// --- getTweetReplies ---
describe.skipIf(!hasToken)("API Integration: getTweetReplies", () => {
  it("returns replies structure for a tweet", async () => {
    // Use a popular tweet that likely has replies
    const tweets = await search("from:elonmusk", { maxResults: 5 });
    if (tweets.length === 0) return; // skip if no results

    const { tweets: replies, nextCursor } = await getTweetReplies(tweets[0].id);
    expect(Array.isArray(replies)).toBe(true);
    // Replies may be empty for some tweets, that's OK
    for (const r of replies) {
      expect(r.id).toBeTruthy();
      expect(r.text).toBeTruthy();
      expect(typeof r.metrics.likes).toBe("number");
    }
  }, 30_000);

  it("returns empty tweets for tweet with no replies", async () => {
    // Very obscure tweet unlikely to have replies
    const { tweets } = await getTweetReplies("1");
    expect(Array.isArray(tweets)).toBe(true);
  }, 30_000);
});

// --- getTweetQuotes ---
describe.skipIf(!hasToken)("API Integration: getTweetQuotes", () => {
  it("returns quotes structure for a tweet", async () => {
    const tweets = await search("from:elonmusk", { maxResults: 5 });
    if (tweets.length === 0) return;

    const { tweets: quotes, nextCursor } = await getTweetQuotes(tweets[0].id);
    expect(Array.isArray(quotes)).toBe(true);
    for (const q of quotes) {
      expect(q.id).toBeTruthy();
      expect(q.text).toBeTruthy();
    }
  }, 30_000);
});

// --- getVerifiedFollowers ---
describe.skipIf(!hasToken)("API Integration: getVerifiedFollowers", () => {
  it("returns verified followers for a known user", async () => {
    // Elon Musk's user ID
    const { followers, nextCursor } = await getVerifiedFollowers("44196397");
    expect(Array.isArray(followers)).toBe(true);
    expect(followers.length).toBeGreaterThan(0);

    const f = followers[0];
    expect(f.id).toBeTruthy();
    expect(f.userName).toBeTruthy();
    expect(f.name).toBeTruthy();
    expect(typeof f.followers).toBe("number");
  }, 30_000);

  it("returns empty for non-existent user", async () => {
    try {
      const { followers } = await getVerifiedFollowers("999999999999999");
      expect(Array.isArray(followers)).toBe(true);
    } catch (e: any) {
      expect(e.message).toBeTruthy();
    }
  }, 30_000);
});

// --- getUserLastTweets ---
describe.skipIf(!hasToken)("API Integration: getUserLastTweets", () => {
  it("fetches last tweets for a user", async () => {
    const { tweets, nextCursor } = await getUserLastTweets("openai", { count: 5 });
    expect(Array.isArray(tweets)).toBe(true);
    expect(tweets.length).toBeGreaterThan(0);
    expect(tweets.length).toBeLessThanOrEqual(5);

    const t = tweets[0];
    expect(t.id).toBeTruthy();
    expect(t.text).toBeTruthy();
    expect(t.username).toBeTruthy();
    expect(typeof t.metrics.likes).toBe("number");
  }, 30_000);

  it("respects count option", async () => {
    const { tweets } = await getUserLastTweets("openai", { count: 3 });
    expect(tweets.length).toBeGreaterThan(0);
    expect(tweets.length).toBeLessThanOrEqual(3);
  }, 30_000);
});

// --- getUserMentions ---
describe.skipIf(!hasToken)("API Integration: getUserMentions", () => {
  it("fetches mentions for a popular user", async () => {
    const { tweets, nextCursor } = await getUserMentions("elonmusk");
    expect(Array.isArray(tweets)).toBe(true);
    expect(tweets.length).toBeGreaterThan(0);

    const t = tweets[0];
    expect(t.id).toBeTruthy();
    expect(t.text).toBeTruthy();
    expect(t.username).toBeTruthy();
    expect(typeof t.metrics.likes).toBe("number");
  }, 30_000);

  it("returns empty for non-existent user", async () => {
    try {
      const { tweets } = await getUserMentions("xyznonexistentuser99999");
      expect(Array.isArray(tweets)).toBe(true);
    } catch (e: any) {
      expect(e.message).toBeTruthy();
    }
  }, 30_000);
});

// --- getTrends ---
describe.skipIf(!hasToken)("API Integration: getTrends", () => {
  it("fetches worldwide trends", async () => {
    const result = await getTrends();
    expect(result.trends.length).toBeGreaterThan(0);

    const t = result.trends[0];
    expect(t.name).toBeTruthy();
    expect(t.rank).toBeGreaterThan(0);
    expect(typeof t.query).toBe("string");

    expect(result.metadata.woeid.id).toBe(1);
  }, 30_000);

  it("fetches trends for a specific woeid", async () => {
    // woeid 23424977 = United States
    const result = await getTrends({ woeid: 23424977 });
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.metadata.woeid.id).toBe(23424977);
  }, 30_000);
});
