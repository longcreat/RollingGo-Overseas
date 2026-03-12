import { describe, expect, it } from "vitest";

import {
  buildHotelDetailPayload,
  buildSearchHotelsPayload,
  parseStarRatings,
} from "../src/payloads.js";

describe("payload builders", () => {
  it("maps search hotel inputs into nested payloads", () => {
    expect(
      buildSearchHotelsPayload({
        originQuery: "Need a hotel",
        place: "Tokyo Disneyland",
        placeType: "景点",
        countryCode: "jp",
        size: 10,
        checkInDate: "2026-04-01",
        stayNights: 2,
        adultCount: 3,
        distanceInMeter: 1200,
        starRatings: [4, 5],
        preferredTags: ["family", " spa "],
        requiredTags: ["pool"],
        excludedTags: ["smoking"],
        preferredBrands: ["Brand A"],
        maxPricePerNight: 1200,
        minRoomSize: 35,
      }),
    ).toEqual({
      originQuery: "Need a hotel",
      place: "Tokyo Disneyland",
      placeType: "景点",
      countryCode: "JP",
      size: 10,
      checkInParam: {
        adultCount: 3,
        checkInDate: "2026-04-01",
        stayNights: 2,
      },
      filterOptions: {
        distanceInMeter: 1200,
        starRatings: [4, 5],
      },
      hotelTags: {
        preferredTags: ["family", "spa"],
        requiredTags: ["pool"],
        excludedTags: ["smoking"],
        preferredBrands: ["Brand A"],
        maxPricePerNight: 1200,
        minRoomSize: 35,
      },
    });
  });

  it("requires exactly one hotel identifier", () => {
    expect(() => buildHotelDetailPayload({})).toThrow(/hotelId or name/);
    expect(() => buildHotelDetailPayload({ hotelId: 1, name: "Hotel" })).toThrow(
      /not both/,
    );
  });

  it("validates child ages and star ratings", () => {
    expect(() =>
      buildHotelDetailPayload({ hotelId: 1, childCount: 2, childAge: [5] }),
    ).toThrow(/childCount/);
    expect(() => parseStarRatings("4.2,5.0")).toThrow(/0.5 increments/);
    expect(parseStarRatings("4.0,5.0")).toEqual([4, 5]);
  });
});
