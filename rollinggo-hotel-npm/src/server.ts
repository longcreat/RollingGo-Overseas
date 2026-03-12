import { FastMCP } from "fastmcp";
import { z } from "zod";

import { requestApi } from "./api.js";
import { PLACE_TYPES } from "./constants.js";
import { removeField } from "./sanitize.js";
import { loadSettings } from "./settings.js";

const serverInstructions = `
RollingGo Hotel MCP server for stdio clients.

Use searchHotels first to find candidate hotels, then call getHotelDetail for room plans and live pricing.
If tag-based filtering is needed, call getHotelSearchTags before building hotelTags.
The server reads the API key from environment variables and returns structured JSON without bookingUrl.
`.trim();

const checkInParamSchema = z.object({
  adultCount: z.number().int().min(1).default(2).optional(),
  checkInDate: z.string().optional(),
  stayNights: z.number().int().min(1).default(1).optional(),
});

const filterOptionsSchema = z.object({
  distanceInMeter: z.number().int().positive().optional(),
  starRatings: z.array(z.number()).min(2).max(2).optional(),
});

const hotelTagsSchema = z.object({
  excludedTags: z.array(z.string()).optional(),
  maxPricePerNight: z.number().positive().optional(),
  minRoomSize: z.number().positive().optional(),
  preferredBrands: z.array(z.string()).optional(),
  preferredTags: z.array(z.string()).optional(),
  requiredTags: z.array(z.string()).optional(),
});

const dateParamSchema = z.object({
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
});

const occupancyParamSchema = z.object({
  adultCount: z.number().int().min(1).default(2).optional(),
  childAgeDetails: z.array(z.number().int().min(0)).optional(),
  childCount: z.number().int().min(0).default(0).optional(),
  roomCount: z.number().int().min(1).default(1).optional(),
});

const localeParamSchema = z.object({
  countryCode: z.string().length(2).default("CN").optional(),
  currency: z.string().length(3).default("CNY").optional(),
});

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data),
      },
    ],
  };
}

export const server = new FastMCP({
  name: "RollingGo Hotel MCP",
  version: "0.1.0",
  instructions: serverInstructions,
});

server.addTool({
  name: "searchHotels",
  description:
    "查询全球酒店。根据地点、日期、星级、距离、标签、品牌和预算等结构化条件，返回酒店候选列表。",
  parameters: z.object({
    originQuery: z.string().min(1),
    place: z.string().min(1),
    placeType: z.enum(PLACE_TYPES),
    checkInParam: checkInParamSchema.optional(),
    countryCode: z.string().length(2).optional(),
    filterOptions: filterOptionsSchema.optional(),
    hotelTags: hotelTagsSchema.optional(),
    size: z.number().int().min(1).max(20).default(5).optional(),
  }),
  execute: async (args) => {
    const settings = loadSettings();
    const result = await requestApi("POST", "/hotelsearch", settings, {
      payload: {
        originQuery: args.originQuery,
        place: args.place,
        placeType: args.placeType,
        ...(args.checkInParam ? { checkInParam: args.checkInParam } : {}),
        ...(args.countryCode ? { countryCode: args.countryCode.toUpperCase() } : {}),
        ...(args.filterOptions ? { filterOptions: args.filterOptions } : {}),
        ...(args.hotelTags ? { hotelTags: args.hotelTags } : {}),
        size: args.size ?? 5,
      },
    });
    return jsonResult(removeField(result, "bookingUrl"));
  },
});

server.addTool({
  name: "getHotelDetail",
  description:
    "查询单个酒店实时房型与价格明细，包括房型、价税、可售状态和退改规则。",
  parameters: z
    .object({
      hotelId: z.number().int().positive().optional(),
      name: z.string().trim().min(1).optional(),
      dateParam: dateParamSchema.optional(),
      occupancyParam: occupancyParamSchema.optional(),
      localeParam: localeParamSchema.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.hotelId === undefined && !value.name) {
        ctx.addIssue({
          code: "custom",
          path: ["hotelId"],
          message: "Provide hotelId or name.",
        });
      }
      if (value.hotelId !== undefined && value.name) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: "Use hotelId or name, not both.",
        });
      }
    }),
  execute: async (args) => {
    const settings = loadSettings();
    const result = await requestApi("POST", "/hoteldetail", settings, {
      payload: {
        ...(args.hotelId !== undefined ? { hotelId: args.hotelId } : {}),
        ...(args.name ? { name: args.name } : {}),
        ...(args.dateParam ? { dateParam: args.dateParam } : {}),
        ...(args.occupancyParam ? { occupancyParam: args.occupancyParam } : {}),
        ...(args.localeParam ? { localeParam: args.localeParam } : {}),
      },
    });
    return jsonResult(removeField(result, "bookingUrl"));
  },
});

server.addTool({
  name: "getHotelSearchTags",
  description:
    "获取酒店搜索标签元数据，适合客户端本地缓存后再构造 searchHotels.hotelTags。",
  execute: async () => {
    const settings = loadSettings();
    const result = await requestApi("GET", "/hoteltags", settings);
    return jsonResult(removeField(result, "bookingUrl"));
  },
});
