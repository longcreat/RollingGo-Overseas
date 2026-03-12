import { describe, expect, it } from "vitest";

import { removeField } from "../src/sanitize.js";

describe("removeField", () => {
  it("removes nested bookingUrl keys", () => {
    expect(
      removeField(
        {
          bookingUrl: "root",
          items: [{ bookingUrl: "nested", hotelId: 1 }],
        },
        "bookingUrl",
      ),
    ).toEqual({
      items: [{ hotelId: 1 }],
    });
  });
});
