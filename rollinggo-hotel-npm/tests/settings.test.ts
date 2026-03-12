import { describe, expect, it } from "vitest";

import { loadSettings } from "../src/settings.js";

describe("loadSettings", () => {
  it("prefers ROLLINGGO_API_KEY and trims base url", () => {
    expect(
      loadSettings({
        ROLLINGGO_API_KEY: "mcp_primary",
        AIGOHOTEL_API_KEY: "mcp_fallback",
        ROLLINGGO_BASE_URL: "https://example.com///",
      }),
    ).toEqual({
      apiKey: "mcp_primary",
      baseUrl: "https://example.com",
    });
  });

  it("falls back to AIGOHOTEL_API_KEY", () => {
    expect(
      loadSettings({
        AIGOHOTEL_API_KEY: "mcp_fallback",
      }),
    ).toEqual({
      apiKey: "mcp_fallback",
      baseUrl: "https://mcp.aigohotel.com/mcp",
    });
  });

  it("throws when no API key exists", () => {
    expect(() => loadSettings({})).toThrow(/Missing API key/);
  });
});
