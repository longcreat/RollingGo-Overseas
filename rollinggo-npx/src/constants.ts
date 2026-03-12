export const DEFAULT_BASE_URL = "https://mcp.aigohotel.com/mcp";

export const PLACE_TYPES = [
  "城市",
  "机场",
  "景点",
  "火车站",
  "地铁站",
  "酒店",
  "区/县",
  "详细地址",
] as const;

export const SEARCH_TABLE_COLUMNS = [
  ["hotelId", "hotelId"],
  ["name", "name"],
  ["starRating", "starRating"],
  ["price", "price"],
  ["currency", "currency"],
  ["areaCode", "areaCode"],
  ["address", "address"],
] as const;
