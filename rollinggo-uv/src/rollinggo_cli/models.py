from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from .constants import PLACE_TYPES
from .errors import CliValidationError

OutputFormat = Literal["json", "table"]


def _error_message(exc: ValidationError) -> str:
    first_error = exc.errors()[0]
    location = ".".join(str(part) for part in first_error["loc"])
    return f"Invalid value for {location}: {first_error['msg']}"


def _normalize_list(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    normalized = [value.strip() for value in values if value and value.strip()]
    return normalized or None


def _parse_star_ratings(raw_value: str | None) -> tuple[float, float] | None:
    if raw_value is None:
        return None

    parts = [part.strip() for part in raw_value.split(",")]
    if len(parts) != 2:
        raise CliValidationError("Expected --star-ratings in the form min,max.")

    try:
        min_value = float(parts[0])
        max_value = float(parts[1])
    except ValueError as exc:
        raise CliValidationError("Star ratings must be numeric values.") from exc

    for value in (min_value, max_value):
        if value < 0.0 or value > 5.0:
            raise CliValidationError("Star ratings must be between 0.0 and 5.0.")
        if (value * 10) % 5 != 0:
            raise CliValidationError("Star ratings must use 0.5 increments.")

    if min_value > max_value:
        raise CliValidationError("Star rating min must be less than or equal to max.")

    return (min_value, max_value)


class CheckInPayload(BaseModel):
    adultCount: int = Field(default=2, ge=1)
    checkInDate: date | None = None
    stayNights: int = Field(default=1, ge=1)

    def to_payload(self) -> dict[str, Any]:
        data = self.model_dump(exclude_none=True)
        if "checkInDate" in data:
            data["checkInDate"] = data["checkInDate"].isoformat()
        return data


class FilterOptionsPayload(BaseModel):
    distanceInMeter: int | None = Field(default=None, gt=0)
    starRatings: tuple[float, float] | None = None

    def to_payload(self) -> dict[str, Any]:
        data = self.model_dump(exclude_none=True)
        if "starRatings" in data:
            data["starRatings"] = list(data["starRatings"])
        return data


class HotelTagsPayload(BaseModel):
    excludedTags: list[str] | None = None
    maxPricePerNight: float | None = Field(default=None, gt=0)
    minRoomSize: float | None = Field(default=None, gt=0)
    preferredBrands: list[str] | None = None
    preferredTags: list[str] | None = None
    requiredTags: list[str] | None = None


class DatePayload(BaseModel):
    checkInDate: date | None = None
    checkOutDate: date | None = None

    @model_validator(mode="after")
    def validate_order(self) -> "DatePayload":
        if self.checkInDate and self.checkOutDate and self.checkOutDate <= self.checkInDate:
            raise ValueError("checkOutDate must be later than checkInDate.")
        return self

    def to_payload(self) -> dict[str, Any]:
        data = self.model_dump(exclude_none=True)
        if "checkInDate" in data:
            data["checkInDate"] = data["checkInDate"].isoformat()
        if "checkOutDate" in data:
            data["checkOutDate"] = data["checkOutDate"].isoformat()
        return data


class OccupancyPayload(BaseModel):
    adultCount: int = Field(default=2, ge=1)
    childAgeDetails: list[int] | None = None
    childCount: int = Field(default=0, ge=0)
    roomCount: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def validate_children(self) -> "OccupancyPayload":
        ages = self.childAgeDetails or []
        if self.childCount != len(ages):
            raise ValueError("childCount must match the number of childAgeDetails values.")
        return self


class LocalePayload(BaseModel):
    countryCode: str = "CN"
    currency: str = "CNY"

    @field_validator("countryCode", mode="before")
    @classmethod
    def normalize_country(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.strip().upper()


class SearchHotelsInput(BaseModel):
    origin_query: str
    place: str
    place_type: Literal[
        "城市",
        "机场",
        "景点",
        "火车站",
        "地铁站",
        "酒店",
        "区/县",
        "详细地址",
    ]
    country_code: str | None = None
    size: int = Field(default=5, ge=1, le=20)
    check_in_date: date | None = None
    stay_nights: int | None = Field(default=None, ge=1)
    adult_count: int | None = Field(default=None, ge=1)
    distance_in_meter: int | None = Field(default=None, gt=0)
    star_ratings: tuple[float, float] | None = None
    preferred_tags: list[str] | None = None
    required_tags: list[str] | None = None
    excluded_tags: list[str] | None = None
    preferred_brands: list[str] | None = None
    max_price_per_night: float | None = Field(default=None, gt=0)
    min_room_size: float | None = Field(default=None, gt=0)

    @field_validator("country_code", mode="before")
    @classmethod
    def normalize_country_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()

    @field_validator("place_type")
    @classmethod
    def validate_place_type(cls, value: str) -> str:
        if value not in PLACE_TYPES:
            raise ValueError("Unsupported place type.")
        return value

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "originQuery": self.origin_query,
            "place": self.place,
            "placeType": self.place_type,
            "size": self.size,
        }

        if self.country_code:
            payload["countryCode"] = self.country_code

        if self.check_in_date or self.stay_nights is not None or self.adult_count is not None:
            payload["checkInParam"] = CheckInPayload(
                adultCount=self.adult_count if self.adult_count is not None else 2,
                checkInDate=self.check_in_date,
                stayNights=self.stay_nights if self.stay_nights is not None else 1,
            ).to_payload()

        if self.distance_in_meter is not None or self.star_ratings is not None:
            payload["filterOptions"] = FilterOptionsPayload(
                distanceInMeter=self.distance_in_meter,
                starRatings=self.star_ratings,
            ).to_payload()

        hotel_tags = HotelTagsPayload(
            excludedTags=_normalize_list(self.excluded_tags),
            maxPricePerNight=self.max_price_per_night,
            minRoomSize=self.min_room_size,
            preferredBrands=_normalize_list(self.preferred_brands),
            preferredTags=_normalize_list(self.preferred_tags),
            requiredTags=_normalize_list(self.required_tags),
        ).model_dump(exclude_none=True)
        if hotel_tags:
            payload["hotelTags"] = hotel_tags

        return payload


class HotelDetailInput(BaseModel):
    hotel_id: int | None = None
    name: str | None = None
    check_in_date: date | None = None
    check_out_date: date | None = None
    adult_count: int | None = Field(default=None, ge=1)
    child_count: int | None = Field(default=None, ge=0)
    child_age: list[int] | None = None
    room_count: int | None = Field(default=None, ge=1)
    country_code: str | None = None
    currency: str | None = None

    @field_validator("country_code", mode="before")
    @classmethod
    def normalize_country_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_identifier(self) -> "HotelDetailInput":
        if self.hotel_id is None and not self.name:
            raise ValueError("Provide either hotel_id or name.")
        if self.hotel_id is not None and self.name:
            raise ValueError("Use either hotel_id or name, not both.")
        return self

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if self.hotel_id is not None:
            payload["hotelId"] = self.hotel_id
        if self.name:
            payload["name"] = self.name

        if self.check_in_date or self.check_out_date:
            payload["dateParam"] = DatePayload(
                checkInDate=self.check_in_date,
                checkOutDate=self.check_out_date,
            ).to_payload()

        if (
            self.adult_count is not None
            or self.child_count is not None
            or self.child_age
            or self.room_count is not None
        ):
            payload["occupancyParam"] = OccupancyPayload(
                adultCount=self.adult_count if self.adult_count is not None else 2,
                childAgeDetails=self.child_age,
                childCount=self.child_count if self.child_count is not None else 0,
                roomCount=self.room_count if self.room_count is not None else 1,
            ).model_dump(exclude_none=True)

        if self.country_code or self.currency:
            payload["localeParam"] = LocalePayload(
                countryCode=self.country_code or "CN",
                currency=self.currency or "CNY",
            ).model_dump(exclude_none=True)

        return payload


def build_search_hotels_payload(**kwargs: Any) -> dict[str, Any]:
    try:
        payload = SearchHotelsInput(**kwargs)
    except ValidationError as exc:
        raise CliValidationError(_error_message(exc)) from exc
    return payload.to_payload()


def build_hotel_detail_payload(**kwargs: Any) -> dict[str, Any]:
    try:
        payload = HotelDetailInput(**kwargs)
    except ValidationError as exc:
        raise CliValidationError(_error_message(exc)) from exc
    return payload.to_payload()


def parse_star_ratings(raw_value: str | None) -> tuple[float, float] | None:
    return _parse_star_ratings(raw_value)
