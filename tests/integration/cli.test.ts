/**
 * CLI integration tests for x-search.ts.
 * Requires X_BEARER_TOKEN env var to be set.
 *
 * These tests run the CLI as a subprocess and validate output.
 * Run with: bun test tests/integration
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { join } from "path";

const SCRIPT = join(import.meta.dir, "..", "..", "x-search.ts");
const hasToken = !!process.env.X_BEARER_TOKEN;

async function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT, ...args], {
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

describe.skipIf(!hasToken)("CLI: search command", () => {
  it("returns results for a basic search", async () => {
    const { stdout, exitCode } = await runCLI(["search", "javascript", "--limit", "5"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("@"); // Should contain usernames
    expect(stdout).toContain("x.com"); // Should contain tweet URLs
  }, 30_000);

  it("supports --json flag", async () => {
    const { stdout, exitCode } = await runCLI(["search", "python", "--json", "--limit", "3"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].id).toBeTruthy();
    expect(parsed[0].text).toBeTruthy();
  }, 30_000);

  it("supports --markdown flag", async () => {
    const { stdout, exitCode } = await runCLI(["search", "technology", "--markdown", "--limit", "3"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("# X Research:");
    expect(stdout).toContain("**@");
    expect(stdout).toContain("[Tweet]");
  }, 30_000);

  it("supports --quick mode", async () => {
    const { stderr, exitCode } = await runCLI(["search", "AI", "--quick"]);
    expect(exitCode).toBe(0);
    expect(stderr).toContain("quick mode");
  }, 30_000);

  it("supports --sort option", async () => {
    const { exitCode } = await runCLI(["search", "programming", "--sort", "recent", "--limit", "5"]);
    expect(exitCode).toBe(0);
  }, 30_000);

  it("supports --from option", async () => {
    const { exitCode } = await runCLI(["search", "hello", "--from", "x", "--limit", "5"]);
    expect(exitCode).toBe(0);
  }, 30_000);

  it("shows cost in stderr", async () => {
    const { stderr, exitCode } = await runCLI(["search", "test", "--limit", "3"]);
    expect(exitCode).toBe(0);
    expect(stderr).toContain("tweets read");
    expect(stderr).toContain("$");
  }, 30_000);

  it("exits with error when no query provided", async () => {
    const { exitCode } = await runCLI(["search"]);
    expect(exitCode).not.toBe(0);
  }, 10_000);
});

describe.skipIf(!hasToken)("CLI: profile command", () => {
  it("fetches a user profile", async () => {
    const { stdout, exitCode } = await runCLI(["profile", "x"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("@");
    expect(stdout).toContain("followers");
  }, 30_000);

  it("supports --json flag", async () => {
    const { stdout, exitCode } = await runCLI(["profile", "x", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.user).toBeDefined();
    expect(parsed.user.username.toLowerCase()).toBe("x");
    expect(Array.isArray(parsed.tweets)).toBe(true);
  }, 30_000);

  it("exits with error for missing username", async () => {
    const { exitCode } = await runCLI(["profile"]);
    expect(exitCode).not.toBe(0);
  }, 10_000);
});

describe.skipIf(!hasToken)("CLI: tweet command", () => {
  let knownTweetId: string;

  beforeAll(async () => {
    // Get a real tweet ID from search
    const { stdout } = await runCLI(["search", "hello", "--json", "--limit", "1"]);
    const tweets = JSON.parse(stdout);
    knownTweetId = tweets[0].id;
  }, 30_000);

  it("fetches a single tweet", async () => {
    const { stdout, exitCode } = await runCLI(["tweet", knownTweetId]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("@");
    expect(stdout).toContain("x.com");
  }, 30_000);

  it("supports --json flag", async () => {
    const { stdout, exitCode } = await runCLI(["tweet", knownTweetId, "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.id).toBe(knownTweetId);
    expect(parsed.text).toBeTruthy();
  }, 30_000);

  it("exits with error for missing tweet ID", async () => {
    const { exitCode } = await runCLI(["tweet"]);
    expect(exitCode).not.toBe(0);
  }, 10_000);
});

describe.skipIf(!hasToken)("CLI: thread command", () => {
  it("fetches a thread", async () => {
    // Get a tweet with a conversation
    const { stdout: searchOut } = await runCLI(["search", "thread", "--json", "--limit", "5"]);
    const tweets = JSON.parse(searchOut);
    if (tweets.length > 0) {
      const { stdout, exitCode } = await runCLI(["thread", tweets[0].conversation_id]);
      expect(exitCode).toBe(0);
      expect(stdout.length).toBeGreaterThan(0);
    }
  }, 60_000);

  it("exits with error for missing tweet ID", async () => {
    const { exitCode } = await runCLI(["thread"]);
    expect(exitCode).not.toBe(0);
  }, 10_000);
});

// Watchlist tests don't need API key for add/remove/show, only for check
describe("CLI: watchlist command (local)", () => {
  it("shows empty watchlist", async () => {
    const { stdout, exitCode } = await runCLI(["watchlist"]);
    expect(exitCode).toBe(0);
    // Either shows the list or says it's empty
    expect(stdout.length).toBeGreaterThan(0);
  }, 10_000);
});

describe("CLI: cache command (local)", () => {
  it("clears cache without error", async () => {
    const { stdout, exitCode } = await runCLI(["cache", "clear"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Cleared");
  }, 10_000);
});

describe("CLI: usage/help", () => {
  it("shows help for unknown command", async () => {
    const { stdout, exitCode } = await runCLI([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("x-search");
    expect(stdout).toContain("search");
    expect(stdout).toContain("profile");
    expect(stdout).toContain("thread");
    expect(stdout).toContain("tweet");
    expect(stdout).toContain("watchlist");
    expect(stdout).toContain("cache");
  }, 10_000);
});
