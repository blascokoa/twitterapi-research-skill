import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import * as cache from "../../lib/cache";
import type { Tweet } from "../../lib/api";

const CACHE_DIR = join(import.meta.dir, "..", "..", "data", "cache");

function makeTweet(id: string): Tweet {
  return {
    id,
    text: `tweet ${id}`,
    author_id: "u1",
    username: "testuser",
    name: "Test User",
    created_at: "2026-02-25T12:00:00.000Z",
    conversation_id: id,
    metrics: { likes: 0, retweets: 0, replies: 0, quotes: 0, impressions: 0, bookmarks: 0 },
    urls: [],
    mentions: [],
    hashtags: [],
    tweet_url: `https://x.com/testuser/status/${id}`,
  };
}

// Clean cache before/after each test
function cleanCache() {
  if (existsSync(CACHE_DIR)) {
    const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      try {
        rmSync(join(CACHE_DIR, f));
      } catch {}
    }
  }
}

beforeEach(cleanCache);
afterEach(cleanCache);

describe("cache", () => {
  describe("set and get", () => {
    it("stores and retrieves tweets", () => {
      const tweets = [makeTweet("1"), makeTweet("2")];
      cache.set("test query", "params=1", tweets);

      const result = cache.get("test query", "params=1");
      expect(result).not.toBeNull();
      expect(result!).toHaveLength(2);
      expect(result![0].id).toBe("1");
      expect(result![1].id).toBe("2");
    });

    it("returns null for missing cache entry", () => {
      const result = cache.get("nonexistent query", "params=1");
      expect(result).toBeNull();
    });

    it("returns null for expired entry", async () => {
      const tweets = [makeTweet("1")];
      cache.set("test query", "params=1", tweets);

      // Wait then request with 1ms TTL — entry should be expired
      await new Promise((r) => setTimeout(r, 10));
      const result = cache.get("test query", "params=1", 1);
      expect(result).toBeNull();
    });

    it("uses different keys for different params", () => {
      const tweets1 = [makeTweet("1")];
      const tweets2 = [makeTweet("2")];

      cache.set("same query", "params=a", tweets1);
      cache.set("same query", "params=b", tweets2);

      const result1 = cache.get("same query", "params=a");
      const result2 = cache.get("same query", "params=b");

      expect(result1![0].id).toBe("1");
      expect(result2![0].id).toBe("2");
    });

    it("uses different keys for different queries", () => {
      const tweets1 = [makeTweet("1")];
      const tweets2 = [makeTweet("2")];

      cache.set("query one", "", tweets1);
      cache.set("query two", "", tweets2);

      expect(cache.get("query one")![0].id).toBe("1");
      expect(cache.get("query two")![0].id).toBe("2");
    });

    it("respects custom TTL", async () => {
      const tweets = [makeTweet("1")];
      cache.set("test", "", tweets);

      // Should exist with long TTL
      expect(cache.get("test", "", 3_600_000)).not.toBeNull();

      // Wait 10ms then check with 1ms TTL — entry should be expired
      await new Promise((r) => setTimeout(r, 10));
      expect(cache.get("test", "", 1)).toBeNull();
    });
  });

  describe("clear", () => {
    it("removes all cache entries", () => {
      cache.set("q1", "", [makeTweet("1")]);
      cache.set("q2", "", [makeTweet("2")]);
      cache.set("q3", "", [makeTweet("3")]);

      const removed = cache.clear();
      expect(removed).toBeGreaterThanOrEqual(3);

      expect(cache.get("q1")).toBeNull();
      expect(cache.get("q2")).toBeNull();
      expect(cache.get("q3")).toBeNull();
    });

    it("returns 0 when cache is empty", () => {
      const removed = cache.clear();
      expect(removed).toBe(0);
    });
  });

  describe("prune", () => {
    it("removes expired entries only", () => {
      cache.set("q1", "", [makeTweet("1")]);
      cache.set("q2", "", [makeTweet("2")]);

      // Prune with huge TTL — nothing should be removed
      const removed = cache.prune(999_999_999);
      expect(removed).toBe(0);

      // Both entries should still exist
      expect(cache.get("q1", "", 999_999_999)).not.toBeNull();
      expect(cache.get("q2", "", 999_999_999)).not.toBeNull();
    });

    it("removes all entries when TTL is very short", async () => {
      cache.set("q1", "", [makeTweet("1")]);
      cache.set("q2", "", [makeTweet("2")]);

      // Wait to ensure file mtime is in the past
      await new Promise((r) => setTimeout(r, 10));
      const removed = cache.prune(1);
      expect(removed).toBeGreaterThanOrEqual(2);
    });
  });
});
