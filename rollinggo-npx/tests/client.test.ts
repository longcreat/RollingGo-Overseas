import { describe, expect, it, vi } from "vitest";

import { requestApi } from "../src/client.js";
import { ApiRequestError } from "../src/errors.js";

describe("requestApi", () => {
  it("sends expected method, headers, and body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ hotelId: 1, bookingUrl: "secret" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await requestApi("POST", "/hotelsearch", "cli-key", {
      baseUrl: "https://example.com/",
      payload: { place: "Tokyo" },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/hotelsearch", {
      body: "{\"place\":\"Tokyo\"}",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer cli-key",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(response).toEqual({ items: [{ hotelId: 1, bookingUrl: "secret" }] });
  });

  it("wraps HTTP errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("server down", { status: 500 }));

    await expect(
      requestApi("GET", "/hoteltags", "cli-key", {
        baseUrl: "https://example.com",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
