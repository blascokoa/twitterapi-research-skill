import { describe, it, expect } from "bun:test";
import {
  formatTweetTelegram,
  formatResultsTelegram,
  formatTweetMarkdown,
  formatResearchMarkdown,
  formatProfileTelegram,
} from "../../lib/format";
import type { Tweet } from "../../lib/api";

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: overrides.id ?? "123456",
    text: overrides.text ?? "This is a test tweet about bun runtime",
    author_id: overrides.author_id ?? "u1",
    username: overrides.username ?? "testuser",
    name: overrides.name ?? "Test User",
    created_at: overrides.created_at ?? new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
    conversation_id: overrides.conversation_id ?? "123456",
    metrics: {
      likes: 42,
      retweets: 5,
      replies: 3,
      quotes: 1,
      impressions: 1500,
      bookmarks: 2,
      ...overrides.metrics,
    },
    urls: overrides.urls ?? [],
    mentions: overrides.mentions ?? [],
    hashtags: overrides.hashtags ?? [],
    tweet_url: overrides.tweet_url ?? "https://x.com/testuser/status/123456",
  };
}

describe("formatTweetTelegram", () => {
  it("includes username and engagement metrics", () => {
    const tweet = makeTweet();
    const result = formatTweetTelegram(tweet);
    expect(result).toContain("@testuser");
    expect(result).toContain("42");
    expect(result).toContain("❤️");
    expect(result).toContain("👁");
    expect(result).toContain("https://x.com/testuser/status/123456");
  });

  it("includes index prefix when provided", () => {
    const tweet = makeTweet();
    const result = formatTweetTelegram(tweet, 0);
    expect(result).toMatch(/^1\. @testuser/);
  });

  it("truncates long text in summary mode", () => {
    const longText = "a".repeat(250);
    const tweet = makeTweet({ text: longText });
    const result = formatTweetTelegram(tweet);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(longText.length + 200);
  });

  it("shows full text when opts.full is true", () => {
    const longText = "a".repeat(250);
    const tweet = makeTweet({ text: longText });
    const result = formatTweetTelegram(tweet, undefined, { full: true });
    expect(result).toContain(longText);
    expect(result).not.toContain("...");
  });

  it("includes first URL when present", () => {
    const tweet = makeTweet({ urls: ["https://example.com/article"] });
    const result = formatTweetTelegram(tweet);
    expect(result).toContain("🔗 https://example.com/article");
  });

  it("strips t.co links from text", () => {
    const tweet = makeTweet({ text: "Check this out https://t.co/abc123 cool stuff" });
    const result = formatTweetTelegram(tweet);
    expect(result).not.toContain("t.co");
    expect(result).toContain("Check this out");
    expect(result).toContain("cool stuff");
  });

  it("formats large numbers compactly", () => {
    const tweet = makeTweet({
      metrics: { likes: 15000, retweets: 0, replies: 0, quotes: 0, impressions: 2500000, bookmarks: 0 },
    });
    const result = formatTweetTelegram(tweet);
    expect(result).toContain("15.0K");
    expect(result).toContain("2.5M");
  });
});

describe("formatResultsTelegram", () => {
  it("shows query header when provided", () => {
    const tweets = [makeTweet({ id: "1" }), makeTweet({ id: "2" })];
    const result = formatResultsTelegram(tweets, { query: "bun runtime" });
    expect(result).toContain('🔍 "bun runtime"');
    expect(result).toContain("2 results");
  });

  it("respects limit option", () => {
    const tweets = Array.from({ length: 10 }, (_, i) => makeTweet({ id: String(i) }));
    const result = formatResultsTelegram(tweets, { limit: 3 });
    expect(result).toContain("+7 more");
  });

  it("handles empty results", () => {
    const result = formatResultsTelegram([], { query: "nothing" });
    expect(result).toContain("0 results");
  });

  it("shows all tweets when under limit", () => {
    const tweets = [makeTweet({ id: "1" }), makeTweet({ id: "2" })];
    const result = formatResultsTelegram(tweets, { limit: 10 });
    expect(result).not.toContain("more");
  });
});

describe("formatTweetMarkdown", () => {
  it("formats as markdown with bold username", () => {
    const tweet = makeTweet();
    const result = formatTweetMarkdown(tweet);
    expect(result).toContain("**@testuser**");
    expect(result).toContain("[Tweet]");
    expect(result).toContain("https://x.com/testuser/status/123456");
  });

  it("includes engagement metrics", () => {
    const tweet = makeTweet();
    const result = formatTweetMarkdown(tweet);
    expect(result).toContain("42L");
    expect(result).toContain("1500I");
  });

  it("includes links section when URLs present", () => {
    const tweet = makeTweet({ urls: ["https://github.com/some/repo"] });
    const result = formatTweetMarkdown(tweet);
    expect(result).toContain("Links:");
    expect(result).toContain("github.com");
  });

  it("quotes the tweet text", () => {
    const tweet = makeTweet({ text: "hello world" });
    const result = formatTweetMarkdown(tweet);
    expect(result).toContain("> hello world");
  });

  it("strips t.co links from text", () => {
    const tweet = makeTweet({ text: "Check this https://t.co/xyz" });
    const result = formatTweetMarkdown(tweet);
    expect(result).not.toContain("t.co");
  });
});

describe("formatResearchMarkdown", () => {
  it("includes title with query", () => {
    const tweets = [makeTweet()];
    const result = formatResearchMarkdown("bun runtime", tweets);
    expect(result).toContain("# X Research: bun runtime");
  });

  it("includes tweet count", () => {
    const tweets = [makeTweet({ id: "1" }), makeTweet({ id: "2" })];
    const result = formatResearchMarkdown("test", tweets);
    expect(result).toContain("**Tweets found:** 2");
  });

  it("includes date", () => {
    const result = formatResearchMarkdown("test", [makeTweet()]);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toContain(`**Date:** ${today}`);
  });

  it("includes cost estimate in metadata", () => {
    const tweets = [makeTweet()];
    const result = formatResearchMarkdown("test", tweets);
    expect(result).toContain("**Est. cost:**");
  });

  it("includes search queries when provided", () => {
    const result = formatResearchMarkdown("test", [makeTweet()], {
      queries: ["query one", "query two"],
    });
    expect(result).toContain("`query one`");
    expect(result).toContain("`query two`");
  });

  it("renders themes when provided", () => {
    const tweets = [
      makeTweet({ id: "1", text: "theme A tweet" }),
      makeTweet({ id: "2", text: "theme B tweet" }),
    ];
    const result = formatResearchMarkdown("test", tweets, {
      themes: [
        { title: "Theme A", tweetIds: ["1"] },
        { title: "Theme B", tweetIds: ["2"] },
      ],
    });
    expect(result).toContain("## Theme A");
    expect(result).toContain("## Theme B");
  });

  it("falls back to top results when no themes", () => {
    const result = formatResearchMarkdown("test", [makeTweet()]);
    expect(result).toContain("## Top Results (by engagement)");
  });
});

describe("formatProfileTelegram", () => {
  it("includes user info", () => {
    const user = {
      username: "elonmusk",
      name: "Elon Musk",
      description: "Mars & Cars",
      public_metrics: {
        followers_count: 150000000,
        tweet_count: 30000,
      },
    };
    const tweets = [makeTweet({ username: "elonmusk" })];
    const result = formatProfileTelegram(user, tweets);
    expect(result).toContain("@elonmusk");
    expect(result).toContain("Elon Musk");
    expect(result).toContain("Mars & Cars");
    expect(result).toContain("150.0M followers");
  });

  it("limits to 10 tweets", () => {
    const user = { username: "test", name: "Test", public_metrics: {} };
    const tweets = Array.from({ length: 15 }, (_, i) =>
      makeTweet({ id: String(i), username: "test" })
    );
    const result = formatProfileTelegram(user, tweets);
    // Should only have 10 numbered tweets (1. through 10.)
    expect(result).toContain("10. @test");
    expect(result).not.toContain("11. @test");
  });
});
