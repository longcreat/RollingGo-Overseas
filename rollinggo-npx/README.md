# rollinggo

`rollinggo` is a Node CLI package for hotel search, hotel detail lookup, and hotel tag discovery.

It is designed for:

- AI agents that operate a terminal and need stable, structured command interfaces
- engineers who want a scriptable hotel query tool from `npm` or `npx`
- local CLI usage with JSON output by default

The npm package name is `rollinggo`.

The executable command is also `rollinggo`.

## What This Package Does

`rollinggo` currently exposes three subcommands:

- `search-hotels`: search hotels using destination, date, occupancy, star range, distance, budget, and tag filters
- `hotel-detail`: fetch room and pricing detail for a specific hotel
- `hotel-tags`: fetch available hotel tag metadata

The CLI is intentionally non-interactive:

- no prompt mode
- no stdin natural-language parsing
- no hidden state between commands

Every query is expressed as one complete command.

This is intentional because AI agents are more reliable with:

- explicit subcommands
- explicit flags
- stable JSON on stdout
- deterministic exit codes

## Package Name vs Command Name

There are two names involved:

- package name: `rollinggo`
- command name: `rollinggo`

That is why temporary `npx` execution looks like this:

```bash
npx rollinggo --help
```

If the package has been installed globally or linked into your environment, you can also use:

```bash
rollinggo --help
```

## Choose a Run Mode

### 1. Temporary Run with `npx`

Use this when:

- you do not want to install the tool permanently
- an AI agent needs to run the command in a clean environment
- you are testing the published package quickly

```bash
npx rollinggo --help
```

Example:

```bash
npx rollinggo search-hotels --origin-query "Find family-friendly hotels near Tokyo Disneyland" --place "Tokyo Disneyland" --place-type "景点"
```

### 2. Install Once and Use `rollinggo` Directly

Use this when:

- the machine will run the tool repeatedly
- an AI agent should call the shortest possible command
- you want `rollinggo ...` to work directly from the shell

Install:

```bash
npm install -g rollinggo
```

Then use:

```bash
rollinggo --help
rollinggo search-hotels --help
```

### 3. Run from Local Source During Development

Use this when:

- you are working inside this repository
- you want to test local changes before publishing

```bash
npm install
npm run build
node dist/cli.js --help
node dist/cli.js search-hotels --help
```

### 4. Simulate Published `npx` Usage from a Local Tarball

Use this when:

- you want to verify exactly what `npx` will execute after packaging
- you want a realistic smoke test before publishing to npm

```bash
npm pack
npx --yes --package ./rollinggo-0.1.0.tgz rollinggo --help
```

## API Key

The CLI resolves the API key in this order:

1. `--api-key`
2. `AIGOHOTEL_API_KEY`

Examples:

```bash
rollinggo hotel-tags --api-key mcp_your_key
```

```bash
export AIGOHOTEL_API_KEY=mcp_your_key
rollinggo hotel-tags
```

If no API key is available, the command fails and writes the error to stderr.

## Help and Parameter Discovery

If a user or AI agent does not know which parameters to use, inspect help first.

Top-level help:

```bash
rollinggo --help
```

Command-specific help:

```bash
rollinggo search-hotels --help
rollinggo hotel-detail --help
rollinggo hotel-tags --help
```

The help output is intended to answer:

- what the command does
- which flags are required
- accepted value formats such as `YYYY-MM-DD` or `min,max`
- supported enum-like values such as `--place-type`
- a minimal executable example

Recommended AI workflow:

1. call `rollinggo --help`
2. call `rollinggo <command> --help`
3. build a structured command
4. parse stdout as JSON unless `--format table` is explicitly requested on `search-hotels`

## Output Contract

Default output behavior:

- stdout: result payload
- stderr: error messages only
- success output format: JSON by default

`search-hotels` additionally supports:

```bash
--format table
```

Important:

- `table` is for human reading
- `json` is the stable machine-readable format
- `hotel-detail` and `hotel-tags` only support `json`

The CLI also removes `bookingUrl` fields from responses before printing.

## Exit Codes

- `0`: success
- `1`: HTTP request failure or network failure
- `2`: CLI validation error or invalid argument combination

## Command Reference

### `search-hotels`

Purpose:

- search hotels by destination
- apply structured filters
- return candidate hotels for comparison

Basic syntax:

```bash
rollinggo search-hotels --origin-query "<text>" --place "<destination>" --place-type "<type>"
```

Required options:

- `--origin-query`
  User's original natural-language requirement. This is forwarded for semantic understanding and ranking.
- `--place`
  A single resolvable destination string such as a city, airport, hotel, point of interest, or full address.
- `--place-type`
  Must match the semantics of `--place`.

Supported `--place-type` values:

- `城市`
- `机场`
- `景点`
- `火车站`
- `地铁站`
- `酒店`
- `区/县`
- `详细地址`

When to use each common `--place-type`:

- `城市`: city-level search such as Beijing, Tokyo, Seattle
- `机场`: airport-centered search such as Shanghai Pudong International Airport
- `景点`: point-of-interest search such as Tokyo Disneyland or Buckingham Palace
- `酒店`: hotel-centric search when the place itself is a hotel
- `详细地址`: exact address text when the destination is a full street address

Optional filters:

- `--country-code`
  ISO 3166-1 alpha-2 country code such as `CN`, `US`, `JP`. Useful when place names are ambiguous.
- `--size`
  Maximum number of returned hotel results. Recommended range: `5` to `20`. Default: `5`.
- `--check-in-date`
  Check-in date in `YYYY-MM-DD`.
- `--stay-nights`
  Stay length in nights. Integer `>= 1`.
- `--adult-count`
  Adults per room. Integer `>= 1`.
- `--distance-in-meter`
  Distance cap in meters. Most useful when `--place-type` is a POI-style place such as `景点`.
- `--star-ratings`
  Star range in `min,max` format. Each value must be from `0.0` to `5.0` and use `0.5` increments.
- `--preferred-tag`
  Soft preference tag. Repeat this flag for multiple values.
- `--required-tag`
  Hard filter tag. Hotels should match these tags.
- `--excluded-tag`
  Exclusion tag. Matching hotels should be filtered out.
- `--preferred-brand`
  Soft brand preference. Repeat this flag for multiple values.
- `--max-price-per-night`
  Maximum nightly price in CNY.
- `--min-room-size`
  Minimum room size in square meters.
- `--format`
  `json` or `table`. Default is `json`.

Examples:

Search hotels in a city:

```bash
rollinggo search-hotels --origin-query "Find high-rated hotels in Seattle" --place "Seattle" --place-type "城市"
```

Search near a point of interest:

```bash
rollinggo search-hotels --origin-query "Find family-friendly hotels near Tokyo Disneyland" --place "Tokyo Disneyland" --place-type "景点" --check-in-date 2026-04-01 --stay-nights 2
```

Search with star range and budget:

```bash
rollinggo search-hotels --origin-query "Luxury hotels near Buckingham Palace" --place "Buckingham Palace" --place-type "景点" --star-ratings 4.5,5.0 --max-price-per-night 2500
```

Search with repeated tags:

```bash
rollinggo search-hotels --origin-query "Family hotels with breakfast and pool" --place "Shanghai Disney Resort" --place-type "景点" --preferred-tag "family friendly" --required-tag "breakfast included" --required-tag "pool"
```

Human-readable table output:

```bash
rollinggo search-hotels --origin-query "Hotels in Tokyo" --place "Tokyo" --place-type "城市" --format table
```

Notes:

- Use `json` for AI or script integration.
- Use `table` only when a human is reading the terminal.
- `--star-ratings` must look like `4.0,5.0`, not `4-5`.

### `hotel-detail`

Purpose:

- fetch detail and pricing for one hotel
- inspect room-level or rate-level information after a hotel has already been identified

Basic syntax:

```bash
rollinggo hotel-detail --hotel-id <id>
```

Identifier rules:

- you must provide exactly one of `--hotel-id` or `--name`
- do not pass both
- `--hotel-id` is preferred whenever available

Why `--hotel-id` is preferred:

- it is exact
- it avoids fuzzy name matching ambiguity
- it is the natural follow-up after `search-hotels`

Options:

- `--hotel-id`
  Unique hotel ID.
- `--name`
  Hotel name used for fuzzy matching when an ID is unavailable.
- `--check-in-date`
  Check-in date in `YYYY-MM-DD`.
- `--check-out-date`
  Check-out date in `YYYY-MM-DD` and must be later than `--check-in-date`.
- `--adult-count`
  Adults per room. Integer `>= 1`.
- `--child-count`
  Children per room. Integer `>= 0`. Must match the number of `--child-age` values.
- `--child-age`
  One child age per flag occurrence. Example: `--child-age 3 --child-age 5`.
- `--room-count`
  Number of rooms. Integer `>= 1`.
- `--country-code`
  ISO 3166-1 alpha-2 code for locale selection. Defaults to `CN` when locale is sent.
- `--currency`
  ISO 4217 currency code such as `CNY` or `USD`. Defaults to `CNY` when locale is sent.

Examples:

Query by hotel ID:

```bash
rollinggo hotel-detail --hotel-id 123456 --check-in-date 2026-04-01 --check-out-date 2026-04-03
```

Query by hotel name:

```bash
rollinggo hotel-detail --name "The Ritz-Carlton Tokyo" --check-in-date 2026-04-01 --check-out-date 2026-04-03
```

Query with occupancy detail:

```bash
rollinggo hotel-detail --hotel-id 123456 --check-in-date 2026-04-01 --check-out-date 2026-04-03 --adult-count 2 --child-count 2 --child-age 4 --child-age 7 --room-count 1
```

Notes:

- If `--child-count 2` is passed, then exactly two `--child-age` flags must also be passed.
- `hotel-detail` supports JSON output only.

### `hotel-tags`

Purpose:

- fetch the hotel tag vocabulary or metadata used by the search layer
- inspect available tags before constructing tag-based hotel search filters

Syntax:

```bash
rollinggo hotel-tags
```

Examples:

```bash
rollinggo hotel-tags
```

```bash
rollinggo hotel-tags --api-key mcp_your_key
```

Notes:

- output format is JSON only
- this command is useful for AI systems that want to inspect available tagging concepts before composing `search-hotels` filters

## End-to-End Example Workflows

### Workflow 1: Search First, Then Fetch Detail

1. search for candidate hotels:

```bash
rollinggo search-hotels --origin-query "Find luxury hotels near Tokyo Station" --place "Tokyo Station" --place-type "火车站"
```

2. pick a hotel from the JSON output, for example by `hotelId`

3. fetch detail:

```bash
rollinggo hotel-detail --hotel-id 123456 --check-in-date 2026-04-01 --check-out-date 2026-04-03
```

### Workflow 2: AI Agent That Does Not Know Parameters Yet

1. inspect command list:

```bash
rollinggo --help
```

2. inspect target command:

```bash
rollinggo search-hotels --help
```

3. build the structured command

4. parse stdout as JSON

### Workflow 3: Human-Friendly Manual Exploration

1. run a table search:

```bash
rollinggo search-hotels --origin-query "Hotels in Seoul" --place "Seoul" --place-type "城市" --format table
```

2. rerun the chosen result in JSON mode for scripting or further processing

## AI Agent Recommendations

If an AI agent is calling this CLI, prefer the following rules:

- always use explicit subcommands
- always prefer JSON output unless a human explicitly asks for a table
- call `--help` before executing a command if parameter meaning is uncertain
- prefer `--hotel-id` over `--name` when both are available
- use `search-hotels` first, then `hotel-detail`
- keep one shell command per task

Good AI pattern:

```bash
rollinggo search-hotels --origin-query "Find business hotels near Pudong Airport" --place "Shanghai Pudong International Airport" --place-type "机场" --check-in-date 2026-04-01 --stay-nights 1 --format json
```

Less reliable pattern:

- vague natural-language stdin
- mixed human explanation in stdout
- partial arguments with implied defaults that the agent never checked

## Common Mistakes

### Mistake: Passing Both `--hotel-id` and `--name`

Do not do this:

```bash
rollinggo hotel-detail --hotel-id 123456 --name "Hotel Name"
```

Use exactly one identifier.

### Mistake: Wrong `--star-ratings` Format

Do not use:

```bash
--star-ratings 4-5
```

Use:

```bash
--star-ratings 4.0,5.0
```

### Mistake: `--child-count` Does Not Match `--child-age`

Do not do this:

```bash
rollinggo hotel-detail --hotel-id 123456 --child-count 2 --child-age 5
```

If `--child-count 2`, you need two `--child-age` flags.

## Troubleshooting

### `rollinggo: command not found`

Possible reasons:

- the package is not installed globally
- the terminal cannot find global npm binaries

Try:

```bash
npx rollinggo --help
```

Or install globally:

```bash
npm install -g rollinggo
rollinggo --help
```

### API key missing

If the command reports a missing API key:

- pass `--api-key`
- or set `AIGOHOTEL_API_KEY`

Example:

```bash
rollinggo hotel-tags --api-key mcp_your_key
```

### Table format used on unsupported commands

`--format table` only works on `search-hotels`.

Use JSON for:

- `hotel-detail`
- `hotel-tags`

### Validation errors

If you get a validation error:

- run the same command with `--help`
- verify date format
- verify star range format
- verify identifier rules
- verify repeated flag counts such as `--child-age`

### No results or no room plans

Important distinction:

- the CLI command itself can succeed while the business result is empty for the chosen hotel, date, or filters

Recommended next steps:

- loosen search filters
- increase `--size`
- remove over-restrictive tags
- verify `--place-type`
- try another date range
- try another hotel from the search results

## Development

Run from local source:

```bash
npm install
npm run build
node dist/cli.js --help
```

Run tests:

```bash
npm test
```

Simulate packaged `npx` usage:

```bash
npm pack
npx --yes --package ./rollinggo-0.1.0.tgz rollinggo --help
```

## Publish

Publish to npm:

```bash
npm publish
```

## Summary

If you remember only three things, remember these:

1. use `npx rollinggo ...` for temporary execution and `npm install -g rollinggo` for repeated use
2. use `rollinggo <subcommand> --help` whenever you are unsure about parameters
3. use JSON output for AI and automation
