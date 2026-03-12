import { z } from "zod";

import { PLACE_TYPES } from "./constants.js";
import { CliValidationError } from "./errors.js";

export const outputFormatSchema = z.enum(["json", "table"]);
export type OutputFormat = z.infer<typeof outputFormatSchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");

function normalizeList(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join(".") || "input";
  return `Invalid value for ${path}: ${issue.message}`;
}

export function parseStarRatings(rawValue?: string): [number, number] | undefined {
  if (rawValue === undefined) {
    return undefined;
  }

  const parts = rawValue.split(",").map((value) => value.trim());
  if (parts.length !== 2) {
    throw new CliValidationError("Expected --star-ratings in the form min,max.");
  }

  const numericValues = parts.map((value) => Number(value));
  if (numericValues.some((value) => Number.isNaN(value))) {
    throw new CliValidationError("Star ratings must be numeric values.");
  }

  const [minValue, maxValue] = numericValues as [number, number];
  for (const value of [minValue, maxValue]) {
    if (value < 0 || value > 5) {
      throw new CliValidationError("Star ratings must be between 0.0 and 5.0.");
    }
    if ((value * 10) % 5 !== 0) {
      throw new CliValidationError("Star ratings must use 0.5 increments.");
    }
  }

  if (minValue > maxValue) {
    throw new CliValidationError("Star rating min must be less than or equal to max.");
  }

  return [minValue, maxValue];
}

const searchInputSchema = z.object({
  originQuery: z.string().min(1),
  place: z.string().min(1),
  placeType: z.enum(PLACE_TYPES),
  countryCode: z.string().trim().length(2).optional(),
  size: z.number().int().min(1).max(20).default(5),
  checkInDate: isoDateSchema.optional(),
  stayNights: z.number().int().min(1).optional(),
  adultCount: z.number().int().min(1).optional(),
  distanceInMeter: z.number().int().positive().optional(),
  starRatings: z.tuple([z.number(), z.number()]).optional(),
  preferredTags: z.array(z.string()).optional(),
  requiredTags: z.array(z.string()).optional(),
  excludedTags: z.array(z.string()).optional(),
  preferredBrands: z.array(z.string()).optional(),
  maxPricePerNight: z.number().positive().optional(),
  minRoomSize: z.number().positive().optional(),
});

const hotelDetailInputSchema = z
  .object({
    hotelId: z.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    checkInDate: isoDateSchema.optional(),
    checkOutDate: isoDateSchema.optional(),
    adultCount: z.number().int().min(1).optional(),
    childCount: z.number().int().min(0).optional(),
    childAge: z.array(z.number().int().min(0)).optional(),
    roomCount: z.number().int().min(1).optional(),
    countryCode: z.string().trim().length(2).optional(),
    currency: z.string().trim().length(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.hotelId && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either hotelId or name.",
        path: ["hotelId"],
      });
    }

    if (value.hotelId && value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either hotelId or name, not both.",
        path: ["name"],
      });
    }

    if (
      value.checkInDate &&
      value.checkOutDate &&
      value.checkOutDate <= value.checkInDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "checkOutDate must be later than checkInDate.",
        path: ["checkOutDate"],
      });
    }

    if ((value.childCount ?? 0) !== (value.childAge?.length ?? 0) && value.childCount !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "childCount must match the number of childAge values.",
        path: ["childCount"],
      });
    }

    if (value.childAge && value.childCount === undefined && value.childAge.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide --child-count when using --child-age.",
        path: ["childAge"],
      });
    }
  });

export function buildSearchHotelsPayload(input: {
  originQuery: string;
  place: string;
  placeType: string;
  countryCode?: string;
  size?: number;
  checkInDate?: string;
  stayNights?: number;
  adultCount?: number;
  distanceInMeter?: number;
  starRatings?: [number, number];
  preferredTags?: string[];
  requiredTags?: string[];
  excludedTags?: string[];
  preferredBrands?: string[];
  maxPricePerNight?: number;
  minRoomSize?: number;
}): Record<string, unknown> {
  const parsed = searchInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CliValidationError(formatZodError(parsed.error));
  }

  const value = parsed.data;
  const payload: Record<string, unknown> = {
    originQuery: value.originQuery,
    place: value.place,
    placeType: value.placeType,
    size: value.size,
  };

  if (value.countryCode) {
    payload.countryCode = value.countryCode.toUpperCase();
  }

  if (
    value.checkInDate !== undefined ||
    value.stayNights !== undefined ||
    value.adultCount !== undefined
  ) {
    payload.checkInParam = {
      adultCount: value.adultCount ?? 2,
      checkInDate: value.checkInDate,
      stayNights: value.stayNights ?? 1,
    };
  }

  if (value.distanceInMeter !== undefined || value.starRatings !== undefined) {
    payload.filterOptions = {
      ...(value.distanceInMeter !== undefined
        ? { distanceInMeter: value.distanceInMeter }
        : {}),
      ...(value.starRatings !== undefined ? { starRatings: value.starRatings } : {}),
    };
  }

  const hotelTags = {
    ...(normalizeList(value.preferredTags)
      ? { preferredTags: normalizeList(value.preferredTags) }
      : {}),
    ...(normalizeList(value.requiredTags)
      ? { requiredTags: normalizeList(value.requiredTags) }
      : {}),
    ...(normalizeList(value.excludedTags)
      ? { excludedTags: normalizeList(value.excludedTags) }
      : {}),
    ...(normalizeList(value.preferredBrands)
      ? { preferredBrands: normalizeList(value.preferredBrands) }
      : {}),
    ...(value.maxPricePerNight !== undefined
      ? { maxPricePerNight: value.maxPricePerNight }
      : {}),
    ...(value.minRoomSize !== undefined ? { minRoomSize: value.minRoomSize } : {}),
  };

  if (Object.keys(hotelTags).length > 0) {
    payload.hotelTags = hotelTags;
  }

  return payload;
}

export function buildHotelDetailPayload(input: {
  hotelId?: number;
  name?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adultCount?: number;
  childCount?: number;
  childAge?: number[];
  roomCount?: number;
  countryCode?: string;
  currency?: string;
}): Record<string, unknown> {
  const parsed = hotelDetailInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CliValidationError(formatZodError(parsed.error));
  }

  const value = parsed.data;
  const payload: Record<string, unknown> = {};

  if (value.hotelId !== undefined) {
    payload.hotelId = value.hotelId;
  }
  if (value.name) {
    payload.name = value.name;
  }

  if (value.checkInDate || value.checkOutDate) {
    payload.dateParam = {
      ...(value.checkInDate ? { checkInDate: value.checkInDate } : {}),
      ...(value.checkOutDate ? { checkOutDate: value.checkOutDate } : {}),
    };
  }

  if (
    value.adultCount !== undefined ||
    value.childCount !== undefined ||
    value.childAge !== undefined ||
    value.roomCount !== undefined
  ) {
    payload.occupancyParam = {
      adultCount: value.adultCount ?? 2,
      childCount: value.childCount ?? 0,
      ...(value.childAge ? { childAgeDetails: value.childAge } : {}),
      roomCount: value.roomCount ?? 1,
    };
  }

  if (value.countryCode || value.currency) {
    payload.localeParam = {
      countryCode: (value.countryCode ?? "CN").toUpperCase(),
      currency: (value.currency ?? "CNY").toUpperCase(),
    };
  }

  return payload;
}
