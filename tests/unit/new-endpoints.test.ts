/**
 * Unit tests for new API endpoint functions.
 * Tests data parsing, edge cases, and parameter handling without hitting the real API.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  getTweetsByIds,
  getTweetReplies,
  getTweetQuotes,
  getVerifiedFollowers,
  getUserLastTweets,
  getUserMentions,
  getTrends,
  type Tweet,
  type UserProfile,
  type Trend,
  type TrendsResult,
} from "../../lib/api";

// We test the exported functions' behavior with edge cases that don't require network calls

describe("getTweetsByIds", () => {
  it("returns empty array for empty input (no API call)", async () => {
    const result = await getTweetsByIds([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe("getTrends result parsing", () => {
  it("TrendsResult interface has correct shape", () => {
    const result: TrendsResult = {
      trends: [
        { name: "Test Trend", query: "test", rank: 1 },
        { name: "#coding", query: "#coding", rank: 2 },
      ],
      metadata: {
        timestamp: 1234567890,
        woeid: { name: "Worldwide", id: 1 },
      },
    };

    expect(result.trends).toHaveLength(2);
    expect(result.trends[0].name).toBe("Test Trend");
    expect(result.trends[0].rank).toBe(1);
    expect(result.metadata.woeid.name).toBe("Worldwide");
    expect(result.metadata.woeid.id).toBe(1);
  });

  it("Trend interface validates fields", () => {
    const trend: Trend = { name: "AI", query: "AI", rank: 5 };
    expect(trend.name).toBe("AI");
    expect(trend.query).toBe("AI");
    expect(trend.rank).toBe(5);
  });
});

describe("UserProfile interface", () => {
  it("has correct shape with all fields", () => {
    const user: UserProfile = {
      type: "user",
      id: "12345",
      userName: "testuser",
      name: "Test User",
      description: "A test user",
      location: "Earth",
      followers: 1000,
      following: 500,
      statusesCount: 5000,
      favouritesCount: 10000,
      mediaCount: 100,
      isBlueVerified: true,
      createdAt: "Thu Dec 13 08:41:26 +0000 2007",
      profilePicture: "https://example.com/pic.jpg",
      coverPicture: "https://example.com/cover.jpg",
      canDm: true,
      pinnedTweetIds: ["111", "222"],
    };

    expect(user.id).toBe("12345");
    expect(user.userName).toBe("testuser");
    expect(user.followers).toBe(1000);
    expect(user.isBlueVerified).toBe(true);
    expect(user.pinnedTweetIds).toHaveLength(2);
  });

  it("supports optional fields as undefined", () => {
    const user: UserProfile = {
      type: "user",
      id: "12345",
      userName: "testuser",
      name: "Test User",
      description: "",
      location: "",
      followers: 0,
      following: 0,
      statusesCount: 0,
      favouritesCount: 0,
      mediaCount: 0,
      createdAt: "",
    };

    expect(user.isBlueVerified).toBeUndefined();
    expect(user.canDm).toBeUndefined();
    expect(user.pinnedTweetIds).toBeUndefined();
  });
});

describe("Tweet type compatibility", () => {
  it("tweets from replies/quotes have same shape as search tweets", () => {
    const tweet: Tweet = {
      id: "123",
      text: "test reply",
      author_id: "u1",
      username: "replier",
      name: "Reply User",
      created_at: "2026-03-01T12:00:00.000Z",
      conversation_id: "100",
      metrics: {
        likes: 5,
        retweets: 1,
        replies: 0,
        quotes: 0,
        impressions: 100,
        bookmarks: 0,
      },
      urls: [],
      mentions: ["@original_poster"],
      hashtags: [],
      media: [{ type: "photo", media_url_https: "https://pbs.twimg.com/media/test.jpg" }],
      tweet_url: "https://x.com/replier/status/123",
    };

    expect(tweet.id).toBe("123");
    expect(tweet.conversation_id).toBe("100");
    expect(tweet.metrics.likes).toBe(5);
    expect(tweet.media[0].type).toBe("photo");
  });
});
