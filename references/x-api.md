# twitterapi.io API Reference

Third-party Twitter/X API via [twitterapi.io](https://twitterapi.io). Full-archive access, no official X developer account required.

## Authentication

API key from env var `TWITTERAPI_IO_KEY`.

```
-H "x-api-key: $TWITTERAPI_IO_KEY"
```

Get your API key from the [twitterapi.io Dashboard](https://twitterapi.io).

## Search Endpoint

### Advanced Search (full archive)
```
GET https://api.twitterapi.io/twitter/tweet/advanced_search
```
Full-archive search (not limited to 7 days). Up to 20 tweets per page. Uses the same query operators as Twitter's native advanced search.

**Parameters:**
- `query` (required) — Search query string (supports Twitter advanced search operators)
- `queryType` (required) — `"Latest"` (by recency) or `"Top"` (by relevance)
- `cursor` — Pagination cursor. Empty string or omit for first page.

**Query examples:**
- `"AI" OR "Twitter" from:elonmusk`
- `crypto lang:en since:2024-01-01_00:00:00_UTC`
- More operators: https://github.com/igorbrigadir/twitter-advanced-search

### Search Operators

| Operator | Example | Notes |
|----------|---------|-------|
| keyword | `bun 2.0` | Implicit AND |
| `OR` | `bun OR deno` | Must be uppercase |
| `-` | `-is:retweet` | Negation |
| `()` | `(fast OR perf)` | Grouping |
| `from:` | `from:elonmusk` | Posts by user |
| `to:` | `to:elonmusk` | Replies to user |
| `#` | `#buildinpublic` | Hashtag |
| `$` | `$AAPL` | Cashtag |
| `lang:` | `lang:en` | BCP-47 language code |
| `is:retweet` | `-is:retweet` | Filter retweets |
| `is:reply` | `-is:reply` | Filter replies |
| `has:media` | `has:media` | Contains media |
| `has:links` | `has:links` | Contains links |
| `since:` | `since:2024-01-01_00:00:00_UTC` | Start date (in query) |
| `until:` | `until:2024-12-31_23:59:59_UTC` | End date (in query) |

**Not available as search operators:** `min_likes`, `min_retweets`, `min_replies`. Filter engagement post-hoc from tweet metrics.

### Response Structure

```json
{
  "tweets": [{
    "type": "tweet",
    "id": "tweet_id",
    "url": "https://x.com/username/status/tweet_id",
    "text": "...",
    "retweetCount": 0,
    "replyCount": 0,
    "likeCount": 0,
    "quoteCount": 0,
    "viewCount": 0,
    "bookmarkCount": 0,
    "createdAt": "Tue Dec 10 07:00:30 +0000 2024",
    "lang": "en",
    "isReply": false,
    "conversationId": "root_tweet_id",
    "author": {
      "type": "user",
      "userName": "handle",
      "id": "user_id",
      "name": "Display Name",
      "isBlueVerified": true,
      "followers": 1000,
      "following": 500,
      "description": "..."
    },
    "entities": {
      "urls": [{"expanded_url": "https://..."}],
      "mentions": [{"userName": "..."}],
      "hashtags": [{"text": "..."}]
    }
  }],
  "has_next_page": true,
  "next_cursor": "cursor_string"
}
```

### Constructing Tweet URLs

Tweet URLs are included directly in the response as the `url` field. Format:
```
https://x.com/{username}/status/{tweet_id}
```

### Linked Content

External URLs from tweets are in `entities.urls[].expanded_url`. Use WebFetch to deep-dive into linked pages (GitHub READMEs, blog posts, docs, etc.).

## Tweet Endpoints

### Get Tweets by IDs
```
GET https://api.twitterapi.io/twitter/tweets?tweet_ids=ID1,ID2,ID3
```
Batch fetch tweets by comma-separated IDs. Same tweet schema as search.

**Response:** `{ "tweets": [...], "status": "success", "message": "" }`

### Get Tweet Thread Context
```
GET https://api.twitterapi.io/twitter/tweet/thread_context?tweetId=ID
```
Returns the full thread context for a tweet — ancestors and descendants. Paginate via `cursor`.

**Response:** `{ "replies": [...], "has_next_page": true, "next_cursor": "..." }`

**Note:** Page size is variable (Twitter platform limitation). `has_next_page` may return true even when no more data exists.

### Get Tweet Replies
```
GET https://api.twitterapi.io/twitter/tweet/replies?tweetId=ID
```
Up to 20 replies per page, ordered by reply time desc.

### Get Tweet Quotations
```
GET https://api.twitterapi.io/twitter/tweet/quotes?tweetId=ID
```
Up to 20 quotes per page, ordered by quote time desc.

## User Endpoints

### Get User Info
```
GET https://api.twitterapi.io/twitter/user/info?userName=handle
```
Returns user profile by screen name.

**Response:**
```json
{
  "data": {
    "type": "user",
    "userName": "handle",
    "id": "user_id",
    "name": "Display Name",
    "isBlueVerified": true,
    "description": "...",
    "followers": 1000,
    "following": 500,
    "statusesCount": 5000,
    "favouritesCount": 10000,
    "createdAt": "Thu Dec 13 08:41:26 +0000 2007"
  },
  "status": "success",
  "msg": ""
}
```

### Get User Last Tweets
```
GET https://api.twitterapi.io/twitter/user/last_tweets?userName=handle
```
Recent tweets sorted by creation time. 20 per page.

**Parameters:**
- `userName` — Screen name (or use `userId` instead)
- `includeReplies` — `true` or `false` (default: `false`)
- `cursor` — Pagination cursor

**Response:** `{ "tweets": [...], "has_next_page": true, "next_cursor": "..." }`

## Rate Limits

twitterapi.io supports up to **200 QPS** per client. No per-window rate limits like the official API. If you hit a 429 error, back off briefly and retry.

The skill uses a 200ms delay between requests as a safety buffer.

## Cost (twitterapi.io Pricing)

twitterapi.io uses **pay-per-use pricing** with prepaid credits.

**Per-resource costs:**
| Resource | Cost |
|----------|------|
| Tweet read (search/lookup) | $0.15 / 1,000 tweets |
| User profile lookup | $0.18 / 1,000 profiles |
| Followers/followings | $0.15 / 1,000 |
| Minimum per request | $0.00015 (even if no data) |

A typical research session: 5 queries × 5 pages × 20 tweets = 500 tweet reads = ~$0.075.

**Search cost:** Each search page returns up to 20 tweets = ~$0.003/page.

| Operation | Est. cost |
|-----------|-----------|
| Quick search (1 page, ≤20 tweets) | ~$0.003 |
| Standard search (5 pages, ~100 tweets) | ~$0.015 |
| Deep research (15 pages, ~300 tweets) | ~$0.045 |
| Profile check (user + 20 tweets) | ~$0.003 |
| Watchlist check (5 accounts) | ~$0.015 |
| Cached repeat (any) | free |

**How x-search saves money:**
- Cache (15min default, 1hr in quick mode) — repeat queries are free
- Quick mode prevents accidental multi-page fetches
- Cost displayed after every search so you know what you're spending
- `--from` targets specific users instead of broad searches

**Special offer:** Discounted rates for students and research institutions.
