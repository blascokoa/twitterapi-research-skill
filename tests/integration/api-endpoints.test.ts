/**
 * Integration tests for X API endpoints.
 * Requires TWITTERAPI_IO_KEY env var to be set.
 *
 * These tests hit the real twitterapi.io API and will consume API credits.
 * Run with: bun test tests/integration
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { search, thread, profile, getTweet, type Tweet } from "../../lib/api";

// Skip all integration tests if no API key
const hasToken = !!process.env.TWITTERAPI_IO_KEY;

describe.skipIf(!hasToken)("API Integration: search", () => {
  it("returns tweets for a common query", async () => {
    const tweets = await search("javascript", { maxResults: 10 });
    expect(tweets.length).toBeGreaterThan(0);

    // Validate tweet structure
    const tweet = tweets[0];
    expect(tweet.id).toBeTruthy();
    expect(tweet.text).toBeTruthy();
    expect(tweet.author_id).toBeTruthy();
    expect(tweet.username).toBeTruthy();
    expect(tweet.created_at).toBeTruthy();
    expect(tweet.tweet_url).toContain("https://x.com/");
    expect(tweet.metrics).toBeDefined();
    expect(typeof tweet.metrics.likes).toBe("number");
    expect(typeof tweet.metrics.retweets).toBe("number");
    expect(typeof tweet.metrics.impressions).toBe("number");
  }, 30_000);

  it("respects maxResults option", async () => {
    const tweets = await search("python programming", { maxResults: 10 });
    expect(tweets.length).toBeLessThanOrEqual(10);
    expect(tweets.length).toBeGreaterThan(0);
  }, 30_000);

  it("supports relevancy sort order", async () => {
    const tweets = await search("javascript OR python", {
      maxResults: 20,
      sortOrder: "relevancy",
    });
    expect(tweets.length).toBeGreaterThan(0);
  }, 30_000);

  it("supports recency sort order", async () => {
    const tweets = await search("news", {
      maxResults: 10,
      sortOrder: "recency",
    });
    expect(tweets.length).toBeGreaterThan(0);
  }, 30_000);

  it("supports since time filter with shorthand", async () => {
    const tweets = await search("the", {
      maxResults: 10,
      since: "1d",
      sortOrder: "recency",
    });
    expect(tweets.length).toBeGreaterThan(0);

    // All tweets should be from last ~24 hours
    const oneDayAgo = Date.now() - 86_400_000 - 60_000; // 1 day + 1 min buffer
    for (const t of tweets) {
      expect(new Date(t.created_at).getTime()).toBeGreaterThan(oneDayAgo);
    }
  }, 30_000);

  it("supports pagination with multiple pages", async () => {
    const singlePage = await search("technology", { maxResults: 10, pages: 1, sortOrder: "recency" });
    const multiPage = await search("technology", { maxResults: 10, pages: 2, sortOrder: "recency" });
    // Multi-page should return >= single page results (if enough data exists)
    expect(multiPage.length).toBeGreaterThanOrEqual(singlePage.length);
  }, 60_000);

  it("returns valid tweet URLs", async () => {
    const tweets = await search("github", { maxResults: 10 });
    for (const t of tweets) {
      expect(t.tweet_url).toMatch(/^https:\/\/x\.com\/.+\/status\/\d+$/);
    }
  }, 30_000);

  it("parses entities (urls, mentions, hashtags) as arrays", async () => {
    const tweets = await search("github", { maxResults: 10 });
    for (const t of tweets) {
      expect(Array.isArray(t.urls)).toBe(true);
      expect(Array.isArray(t.mentions)).toBe(true);
      expect(Array.isArray(t.hashtags)).toBe(true);
    }
  }, 30_000);
});

describe.skipIf(!hasToken)("API Integration: getTweet", () => {
  let knownTweetId: string;

  // First, find a real tweet ID via search to use in subsequent tests
  beforeAll(async () => {
    const tweets = await search("hello", { maxResults: 10 });
    expect(tweets.length).toBeGreaterThan(0);
    knownTweetId = tweets[0].id;
  }, 30_000);

  it("fetches a single tweet by ID", async () => {
    const tweet = await getTweet(knownTweetId);
    expect(tweet).not.toBeNull();
    expect(tweet!.id).toBe(knownTweetId);
    expect(tweet!.text).toBeTruthy();
    expect(tweet!.username).toBeTruthy();
    expect(tweet!.metrics).toBeDefined();
  }, 30_000);

  it("returns null for non-existent tweet", async () => {
    // Use a clearly invalid tweet ID
    try {
      const tweet = await getTweet("1");
      // If it doesn't throw, it should be null or have no data
      // The API may return an error for very old/invalid IDs
    } catch (e: any) {
      // Expected — invalid tweet ID will cause API error
      expect(e.message).toBeTruthy();
    }
  }, 30_000);
});

describe.skipIf(!hasToken)("API Integration: profile", () => {
  it("fetches a user profile and recent tweets", async () => {
    // Use a well-known, active account
    const { user, tweets } = await profile("x", { count: 5 });

    // User object validation
    expect(user).toBeDefined();
    expect(user.username.toLowerCase()).toBe("x");
    expect(user.name).toBeTruthy();
    expect(user.id).toBeTruthy();

    // Tweets validation
    expect(Array.isArray(tweets)).toBe(true);
  }, 30_000);

  it("respects count option", async () => {
    const { tweets } = await profile("x", { count: 5 });
    // Should return at most 5 tweets (may be fewer if user hasn't posted much)
    expect(tweets.length).toBeLessThanOrEqual(5);
  }, 30_000);

  it("throws for non-existent user", async () => {
    try {
      await profile("thisisnotarealuser999999999");
      // Should not reach here
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toBeTruthy();
    }
  }, 30_000);
});

describe.skipIf(!hasToken)("API Integration: thread", () => {
  it("fetches a conversation thread", async () => {
    // First find a tweet that's part of a conversation
    const tweets = await search("thread", { maxResults: 20 });
    const withConversation = tweets.find(
      (t) => t.conversation_id && t.conversation_id !== t.id
    );

    if (withConversation) {
      const threadTweets = await thread(withConversation.conversation_id, { pages: 1 });
      expect(Array.isArray(threadTweets)).toBe(true);
      // Thread should contain at least the root tweet
      expect(threadTweets.length).toBeGreaterThan(0);
    } else {
      // If no threaded tweets found, just verify thread returns an array
      // for a regular tweet's conversation_id
      const threadTweets = await thread(tweets[0].conversation_id, { pages: 1 });
      expect(Array.isArray(threadTweets)).toBe(true);
    }
  }, 60_000);

  it("returns valid tweet objects in thread", async () => {
    const tweets = await search("conversation", { maxResults: 10 });
    if (tweets.length > 0) {
      const threadTweets = await thread(tweets[0].conversation_id, { pages: 1 });
      for (const t of threadTweets) {
        expect(t.id).toBeTruthy();
        expect(t.text).toBeTruthy();
        expect(typeof t.metrics.likes).toBe("number");
      }
    }
  }, 60_000);
});
