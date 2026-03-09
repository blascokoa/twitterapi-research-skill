# twitterapi-research-skill

> Fork of [rohunvora/x-research-skill](https://github.com/rohunvora/x-research-skill), rewritten to use [twitterapi.io](https://twitterapi.io) endpoints directly with extended coverage.

X/Twitter research skill for [OpenClaw](https://openclaw.ai). Search, filter, monitor — all from the terminal.

## What it does

Wraps the [twitterapi.io](https://twitterapi.io) third-party Twitter API into a fast CLI so your AI agent (or you) can search tweets, pull threads, fetch replies, quotes, trends, verified followers, and get sourced research without writing curl commands. Full-archive search (not limited to 7 days), no official X developer account required.

- **Search** with engagement sorting, time filtering, noise removal
- **Quick mode** for cheap, targeted lookups
- **Replies & Quotes** for any tweet
- **Trends** by location (WOEID)
- **Verified Followers** for any user
- **Watchlists** for monitoring accounts
- **Cache** to avoid repeat API charges
- **Cost transparency** — every search shows what it cost

## Install

```bash
# From your workspace
mkdir -p skills
cd skills
git clone https://github.com/blascokoa/twitterapi-research-skill.git x-research
```

## Setup

1. **twitterapi.io API Key** — Get one from the [twitterapi.io Dashboard](https://twitterapi.io)
2. **Set the env var:**
   ```bash
   export TWITTERAPI_IO_KEY="your-api-key-here"
   ```
   Or use the alternate name:
   ```bash
   export TWITTERAPI_API_KEY="your-api-key-here"
   ```
   Or save it to `~/.config/env/global.env`:
   ```
   TWITTERAPI_IO_KEY=your-api-key-here
   ```
3. **Install Bun** (for CLI tooling): https://bun.sh

## Usage

### Natural language (just talk to the agent)
- "What are people saying about Opus 4.6?"
- "Search X for OpenClaw skills"
- "What's CT saying about BNKR today?"
- "Check what @frankdegods posted recently"
- "Get the replies to this tweet"
- "What's trending worldwide?"

### CLI commands
```bash
cd skills/x-research

# Search (sorted by likes, auto-filters retweets)
bun run x-search.ts search "your query" --sort likes --limit 10

# Profile — recent tweets from a user
bun run x-search.ts profile username

# User's last tweets (via dedicated endpoint)
bun run x-search.ts user-tweets username [--count N] [--replies]

# Thread — full conversation
bun run x-search.ts thread TWEET_ID

# Single tweet
bun run x-search.ts tweet TWEET_ID

# Batch tweet lookup by IDs
bun run x-search.ts tweets ID1,ID2,ID3

# Replies to a tweet
bun run x-search.ts replies TWEET_ID [--cursor CURSOR]

# Quotes of a tweet
bun run x-search.ts quotes TWEET_ID [--cursor CURSOR]

# Verified followers of a user
bun run x-search.ts followers username [--cursor CURSOR]

# Trends by location
bun run x-search.ts trends [--woeid 1]

# Watchlist
bun run x-search.ts watchlist add username "optional note"
bun run x-search.ts watchlist check

# Save research to file
bun run x-search.ts search "query" --save --markdown
```

### Search options
```
--sort likes|impressions|retweets|recent   (default: likes)
--since 1h|3h|12h|1d|7d     Time filter (default: last 7 days)
--min-likes N              Filter minimum likes
--min-impressions N        Filter minimum impressions
--pages N                  Pages to fetch, 1-25 (default: 5, ~20 tweets/page)
--limit N                  Results to display (default: 15)
--quick                    Quick mode (see below)
--from <username>          Shorthand for from:username in query
--quality                  Pre-filter low-engagement tweets (min_faves:10)
--no-replies               Exclude replies
--save                     Save to ~/clawd/drafts/
--json                     Raw JSON output
--markdown                 Markdown research doc
```

## Quick Mode

`--quick` is designed for fast, cheap lookups when you just need a pulse check on a topic.

**What it does:**
- Forces single page (max 10 results) — reduces API reads
- Auto-appends `-is:retweet -is:reply` noise filters (unless you explicitly used those operators)
- Uses 1-hour cache TTL instead of the default 15 minutes
- Shows cost summary after results

**Examples:**
```bash
bun run x-search.ts search "BNKR" --quick
bun run x-search.ts search "BNKR" --from voidcider --quick
bun run x-search.ts search "AI agents" --quality --quick
```

## Cost

This skill uses [twitterapi.io](https://twitterapi.io) — a third-party Twitter API.

**Per-resource costs:**
| Resource | Cost |
|----------|------|
| Tweet read (search/lookup) | $0.15 / 1,000 tweets |
| User profile lookup | $0.18 / 1,000 profiles |
| Followers/followings | $0.15 / 1,000 |
| Verified followers | $0.15 / 1,000 |
| Trends | $0.15 / request |
| Minimum per request | $0.00015 (even if no data) |

| Operation | Est. cost |
|-----------|-----------|
| Quick search (1 page, ≤20 tweets) | ~$0.003 |
| Standard search (5 pages, ~100 tweets) | ~$0.015 |
| Deep research (15 pages, ~300 tweets) | ~$0.045 |
| Profile check (user + 20 tweets) | ~$0.003 |
| Watchlist check (5 accounts) | ~$0.015 |
| Trends lookup | ~$0.00015 |
| Cached repeat (any) | free |

**How x-search saves money:**
- Cache (15min default, 1hr in quick mode) — repeat queries are free
- Quick mode prevents accidental multi-page fetches
- Cost displayed after every search so you know what you're spending

## File structure

```
x-research/
├── SKILL.md              # Agent instructions
├── x-search.ts           # CLI entry point
├── lib/
│   ├── api.ts            # twitterapi.io wrapper
│   ├── cache.ts          # File-based cache
│   └── format.ts         # Telegram + markdown formatters
├── data/
│   ├── watchlist.json    # Accounts to monitor
│   └── cache/            # Auto-managed
├── references/
│   └── x-api.md          # twitterapi.io endpoint reference
└── tests/
    ├── unit/             # Unit tests
    └── integration/      # Integration tests (requires API key)
```

## Security

**API key handling:** x-search reads your key from the `TWITTERAPI_IO_KEY` (or `TWITTERAPI_API_KEY`) env var or `~/.config/env/global.env`. The key is never printed to stdout, but be aware:

- **AI coding agents** may log tool calls — including HTTP headers — in session transcripts. Your API key could appear in those logs.
- **Recommendations:**
  - Set the env var as a system env var (not inline in commands)
  - Review your agent's session log settings
  - Rotate your key if you suspect exposure

## Limitations

- Read-only — never posts or interacts
- Requires twitterapi.io API key with prepaid credits ([sign up](https://twitterapi.io))
- `min_likes` / `min_retweets` search operators unavailable (filtered post-hoc instead)
- Search pages return ~20 tweets — use more pages for larger result sets
- Uses a third-party API — availability depends on twitterapi.io uptime

## License

MIT
