from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP
from pydantic import Field

from . import __version__
from .api import request_api
from .models import CheckInParam, DateParam, FilterOptions, HotelTags, LocaleParam, OccupancyParam, model_dump
from .sanitize import remove_field

SERVER_INSTRUCTIONS = """
RollingGo Hotel MCP server for stdio clients.

Use `searchHotels` first to find candidate hotels, then call `getHotelDetail` for room plans and live pricing.
If tag-based filtering is needed, call `getHotelSearchTags` before building `hotelTags`.
The server reads the API key from environment variables and returns structured JSON without `bookingUrl`.
""".strip()

mcp = FastMCP(
    name="RollingGo Hotel MCP",
    version=__version__,
    instructions=SERVER_INSTRUCTIONS,
)


@mcp.tool(name="searchHotels")
async def search_hotels(
    originQuery: Annotated[str, Field(description="用户原始自然语言需求（原句），用于语义理解与召回排序。")],
    place: Annotated[
        str,
        Field(
            description="用于定位检索范围的地点名称。请传可被地理解析的单一地点文本，例如北京、上海浦东国际机场、东京迪士尼乐园。"
        ),
    ],
    placeType: Annotated[
        str,
        Field(description="地点类型。仅允许以下值之一：城市、机场、景点、火车站、地铁站、酒店、区/县、详细地址。"),
    ],
    checkInParam: Annotated[
        CheckInParam | None,
        Field(description="入住参数对象。字段：adultCount、checkInDate、stayNights。"),
    ] = None,
    countryCode: Annotated[str | None, Field(description="国家二字码（ISO 3166-1 alpha-2，大写），如 CN、US、JP。")] = None,
    filterOptions: Annotated[
        FilterOptions | None,
        Field(description="基础筛选对象。字段：distanceInMeter、starRatings。"),
    ] = None,
    hotelTags: Annotated[
        HotelTags | None,
        Field(description="标签筛选对象。字段：preferredTags、requiredTags、excludedTags、preferredBrands、maxPricePerNight、minRoomSize。"),
    ] = None,
    size: Annotated[int, Field(description="返回酒店数量上限。建议传 5-20 的整数；默认5。")] = 5,
) -> dict[str, Any]:
    """
    查询全球酒店。根据地点、日期、星级、距离、标签、品牌和预算等结构化条件，返回酒店候选列表。
    """
    params: dict[str, Any] = {
        "originQuery": originQuery,
        "place": place,
        "placeType": placeType,
        "size": size,
    }

    if checkInParam:
        params["checkInParam"] = model_dump(checkInParam)
    if countryCode:
        params["countryCode"] = countryCode
    if filterOptions:
        params["filterOptions"] = model_dump(filterOptions)
    if hotelTags:
        params["hotelTags"] = model_dump(hotelTags)

    result = await request_api("POST", "/hotelsearch", payload=params)
    return remove_field(result, "bookingUrl")


@mcp.tool(name="getHotelDetail")
async def get_hotel_detail(
    hotelId: Annotated[int | None, Field(description="酒店唯一ID。与 name 二选一；若同时传入，优先使用 hotelId。")] = None,
    name: Annotated[str | None, Field(description="酒店名称（模糊匹配）。仅在没有 hotelId 时使用。")] = None,
    dateParam: Annotated[
        DateParam | None,
        Field(description="入离店日期对象。字段：checkInDate、checkOutDate。"),
    ] = None,
    occupancyParam: Annotated[
        OccupancyParam | None,
        Field(description="入住人数与房间数量对象。字段：adultCount、childCount、childAgeDetails、roomCount。"),
    ] = None,
    localeParam: Annotated[
        LocaleParam | None,
        Field(description="区域与币种对象。字段：countryCode、currency。"),
    ] = None,
) -> dict[str, Any]:
    """
    查询单个酒店实时房型与价格明细，包括房型、价税、可售状态和退改规则。
    """
    if hotelId is None and not name:
        raise ValueError("hotelId and name cannot both be empty.")

    params: dict[str, Any] = {}
    if hotelId is not None:
        params["hotelId"] = hotelId
    if name:
        params["name"] = name
    if dateParam:
        params["dateParam"] = model_dump(dateParam)
    if occupancyParam:
        params["occupancyParam"] = model_dump(occupancyParam)
    if localeParam:
        params["localeParam"] = model_dump(localeParam)

    result = await request_api("POST", "/hoteldetail", payload=params)
    return remove_field(result, "bookingUrl")


@mcp.tool(name="getHotelSearchTags")
async def get_hotel_search_tags() -> dict[str, Any]:
    """
    获取酒店搜索标签元数据，适合客户端本地缓存后再构造 searchHotels.hotelTags。
    """
    result = await request_api("GET", "/hoteltags")
    return remove_field(result, "bookingUrl")


def main() -> None:
    mcp.run(transport="stdio", show_banner=False)
