import pytest

from rollinggo_cli.models import (
    build_hotel_detail_payload,
    build_search_hotels_payload,
    parse_star_ratings,
)


def test_build_search_hotels_payload_maps_nested_fields() -> None:
    payload = build_search_hotels_payload(
        origin_query="Need a hotel",
        place="Tokyo Disneyland",
        place_type="景点",
        country_code="jp",
        size=10,
        check_in_date="2026-04-01",
        stay_nights=2,
        adult_count=3,
        distance_in_meter=1500,
        star_ratings=parse_star_ratings("4.0,5.0"),
        preferred_tags=["family", " spa "],
        required_tags=["pool"],
        excluded_tags=["smoking"],
        preferred_brands=["Brand A"],
        max_price_per_night=1200,
        min_room_size=35,
    )

    assert payload == {
        "originQuery": "Need a hotel",
        "place": "Tokyo Disneyland",
        "placeType": "景点",
        "countryCode": "JP",
        "size": 10,
        "checkInParam": {
            "adultCount": 3,
            "checkInDate": "2026-04-01",
            "stayNights": 2,
        },
        "filterOptions": {
            "distanceInMeter": 1500,
            "starRatings": [4.0, 5.0],
        },
        "hotelTags": {
            "excludedTags": ["smoking"],
            "maxPricePerNight": 1200.0,
            "minRoomSize": 35.0,
            "preferredBrands": ["Brand A"],
            "preferredTags": ["family", "spa"],
            "requiredTags": ["pool"],
        },
    }


def test_build_hotel_detail_payload_requires_exactly_one_identifier() -> None:
    with pytest.raises(Exception, match="hotel_id or name"):
        build_hotel_detail_payload()

    with pytest.raises(Exception, match="not both"):
        build_hotel_detail_payload(hotel_id=1, name="Hotel")


def test_build_hotel_detail_payload_validates_child_ages() -> None:
    with pytest.raises(Exception, match="childCount"):
        build_hotel_detail_payload(hotel_id=1, child_count=2, child_age=[5])


def test_parse_star_ratings_validation() -> None:
    with pytest.raises(Exception, match="min,max"):
        parse_star_ratings("4.0")

    with pytest.raises(Exception, match="0.5 increments"):
        parse_star_ratings("4.2,5.0")

    assert parse_star_ratings("4.0,5.0") == (4.0, 5.0)
