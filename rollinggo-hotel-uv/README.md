# rollinggo-mcp

`rollinggo-mcp` is the PyPI package for the RollingGo hotel MCP server.

It is intended for MCP clients that connect over `stdio` and want to call hotel tools directly.

Exposed tools:

- `searchHotels`
- `getHotelDetail`
- `getHotelSearchTags`

## Package And Command

- PyPI package: `rollinggo-mcp`
- executable command: `rollinggo-mcp`

## Required Environment Variable

Configure one of the following:

1. `ROLLINGGO_API_KEY`
2. `AIGOHOTEL_API_KEY`

Optional override:

- `ROLLINGGO_BASE_URL`

## Run With uvx

Run the published package directly from PyPI:

```bash
uvx --from rollinggo-mcp rollinggo-mcp
```

PowerShell example:

```powershell
$env:ROLLINGGO_API_KEY="mcp_your_key"
uvx --from rollinggo-mcp rollinggo-mcp
```

## MCP Client Config With uvx

Use this when your MCP client supports `command` + `args` style stdio configuration.

```json
{
  "mcpServers": {
    "rollinggo-hotel": {
      "command": "uvx",
      "args": ["--from", "rollinggo-mcp", "rollinggo-mcp"],
      "env": {
        "ROLLINGGO_API_KEY": "mcp_your_key"
      }
    }
  }
}
```

## What The Server Does

- `searchHotels`: search hotels by destination, dates, star range, tags, brand, distance, and budget
- `getHotelDetail`: query live room plans and rate details for a selected hotel
- `getHotelSearchTags`: fetch tag metadata for structured filtering

## Notes

- transport defaults to `stdio`
- results strip `bookingUrl` before returning them to MCP clients
- FastMCP version is pinned to `3.1.0`
