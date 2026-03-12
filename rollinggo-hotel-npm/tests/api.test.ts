import { describe, expect, it, vi } from "vitest";

import { requestApi } from "../src/api.js";

describe("requestApi", () => {
  it("sends bearer auth and returns JSON", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.com/hoteltags");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer mcp_test",
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    await expect(
      requestApi("GET", "/hoteltags", {
        apiKey: "mcp_test",
        baseUrl: "https://example.com/",
      }, {
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("surfaces non-2xx failures", async () => {
    const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));

    await expect(
      requestApi(
        "GET",
        "/hoteltags",
        {
          apiKey: "mcp_test",
          baseUrl: "https://example.com",
        },
        {
          fetchImpl: fetchImpl as typeof fetch,
        },
      ),
    ).rejects.toThrow(/401/);
  });
});
