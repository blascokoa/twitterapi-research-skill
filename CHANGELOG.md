# Changelog

## v2.5.0 (2026-03-09)

### Added
- **`mentions` command** — Fetch tweets mentioning a user (`GET /twitter/user/mentions`), with pagination support via `--pages N`
- New `getUserMentions()` API function in `lib/api.ts`
- 2 new integration tests for the mentions endpoint
- Documentation updated across x-api.md, SKILL.md, README.md, and CHANGELOG.md

## v2.4.0 (2026-03-09)

### Added — New API Endpoints
Implemented 6 missing twitterapi.io endpoints, expanding the skill from 4 to 10 API operations.

- **`tweets` command** — Fetch multiple tweets by IDs in a single batch call (`GET /twitter/tweets?tweet_ids=ID1,ID2,...`)
- **`replies` command** — Fetch replies to a tweet using the v2 endpoint (`GET /twitter/tweet/replies`), with pagination support
- **`quotes` command** — Fetch quote tweets for a given tweet (`GET /twitter/tweet/quotes`), with pagination support
- **`followers` command** — Fetch verified followers for a user by user_id (`GET /twitter/user/verifiedFollowers`)
- **`user-tweets` command** — Fetch a user's last tweets standalone, without fetching user info (`GET /twitter/user/last_tweets`)
- **`trends` command** — Fetch trending topics by WOEID (`GET /twitter/trends`), defaults to worldwide (WOEID=1)
- New TypeScript interfaces: `UserProfile`, `Trend`, `TrendsResult`
- All new CLI commands support `--json` output and `--pages` pagination where applicable

### Fixed
- **`data.tweets` nesting bug** — The `last_tweets` API nests tweets inside `data.tweets`, not at the root `tweets` key. Fixed in both existing `profile()` and new `getUserLastTweets()` functions.
- **`getApiKey()` now checks `TWITTERAPI_API_KEY`** as an alternate env var name (in addition to `TWITTERAPI_IO_KEY`)

### Docs
- **`references/x-api.md`** expanded from 218 → 377 lines — full documentation for all 6 new endpoints, CLI commands reference table, updated cost table, WOEID values for trends, and `data.tweets` nesting quirk documented
- **`CHANGELOG.md`** updated with complete history of this release

### Tests
- 12 new integration tests covering all 6 endpoints against the live twitterapi.io API
- Unit tests for new type interfaces and edge cases
- All 73 tests pass (58 unit + 15 existing integration + 12 new integration), 0 failures

## v2.3.0 (2026-02-09)

### Fixed — Remove LLM Hallucinations
Most LLMs have the old X API tier system (Basic/Pro/Enterprise, $200/mo subscriptions) baked into their training data. This caused confusion for users whose agents referenced pricing and access levels that no longer exist. This release updates all skill docs to reflect the current pay-per-use model so your agent has accurate information.

- **Purged all stale tier/subscription references** across 6 files (13 instances of "Basic tier", "current tier", "enterprise-only" etc.)
- **Full-archive search** (`/2/tweets/search/all`) is available on pay-per-use — not enterprise-only as LLMs commonly claim
- **Updated rate limits** — old per-15-min caps replaced by spending limits in Developer Console
- **Clarified 7-day limit** is a skill limitation (using recent search endpoint), not an API restriction
- **Updated query length limits** — 512 chars (recent), 1024 (full-archive), 4096 (enterprise)
- Added per-resource cost breakdown: $0.005/post read, $0.010/user lookup, $0.010/post create
- Added 24-hour deduplication docs, xAI credit bonus tiers, usage monitoring endpoint

### Fixed
- **Tweet truncation bug** — `tweet` and `thread` commands now show full tweet text instead of cutting off at 200 characters. Search results still truncate for readability. (h/t @sergeykarayev)

### Added
- **Security section in README** — Documents bearer token exposure risk when running inside AI coding agents with session logging. Includes recommendations for token handling.

## v2.2.0 (2026-02-08)

### Added
- **`--quick` mode** — Smarter, cheaper searches. Single page, auto noise filtering (`-is:retweet -is:reply`), 1hr cache TTL. Designed for fast pulse checks.
- **`--from <username>`** — Shorthand for `from:username` queries. `search "BNKR" --from voidcider` instead of typing the full operator.
- **`--quality` flag** — Filters out low-engagement tweets (≥10 likes). Applied post-fetch since `min_faves` operator isn't available via the API.
- **Cost display on all searches** — Every search now shows estimated API cost: `📊 N tweets read · est. cost ~$X`

### Changed
- README cleaned up — removed duplicate cost section, added Quick Mode and Cost docs
- Cache supports variable TTL (1hr in quick mode, 15min default)

## v2.1.0 (2026-02-08)

### Added
- **`--since` time filter** — search only recent tweets: `--since 1h`, `--since 3h`, `--since 30m`, `--since 1d`
  - Accepts shorthand (`1h`, `30m`, `2d`) or ISO 8601 timestamps
  - Great for monitoring during catalysts or checking what just dropped
- Minutes support (`30m`, `15m`) in addition to hours and days
- Cache keys now include time filter to prevent stale results across different time ranges

## v2.0.0 (2026-02-08)

### Added
- **`x-search.ts` CLI** — Bun script wrapping the X API. No more inline curl/python one-liners.
  - `search` — query with auto noise filtering, engagement sorting, pagination
  - `profile` — recent tweets from any user
  - `thread` — full conversation thread by tweet ID
  - `tweet` — single tweet lookup
  - `watchlist` — manage accounts to monitor, batch-check recent activity
  - `cache clear` — manage result cache
- **`lib/api.ts`** — Typed X API wrapper with search, thread, profile, tweet lookup, engagement filtering, deduplication
- **`lib/cache.ts`** — File-based cache with 15-minute TTL. Avoids re-fetching identical queries.
- **`lib/format.ts`** — Output formatters for Telegram (mobile-friendly) and markdown (research docs)
- **Watchlist system** — `data/watchlist.json` for monitoring accounts. Useful for heartbeat integration.
- **Auto noise filtering** — `-is:retweet` added by default unless already in query
- **Engagement sorting** — `--sort likes|impressions|retweets|recent`
- **Post-hoc filtering** — `--min-likes N` and `--min-impressions N` (since X API doesn't support these as search operators)
- **Save to file** — `--save` flag auto-saves research to `~/clawd/drafts/`
- **Multiple output formats** — `--json` for raw data, `--markdown` for research docs, default for Telegram

### Changed
- **SKILL.md** rewritten to reference CLI tooling. Research loop instructions preserved and updated.
- **README.md** expanded with full install, setup, usage, and API cost documentation.

### How it compares to v1
- v1 was a prompt-only skill — Claude assembled raw curl commands with inline Python parsers each time
- v2 wraps everything in typed Bun scripts — faster execution, cleaner output, fewer context tokens burned on boilerplate
- Same agentic research loop, same X API, just better tooling underneath

## v1.0.0 (2026-02-08)

### Added
- Initial release
- SKILL.md with agentic research loop (decompose → search → refine → follow threads → deep-dive → synthesize)
- `references/x-api.md` with full X API endpoint reference
- Search operators, pagination, thread following, linked content deep-diving
