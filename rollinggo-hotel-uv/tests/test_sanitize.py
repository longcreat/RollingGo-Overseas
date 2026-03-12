from rollinggo_mcp.sanitize import remove_field


def test_remove_field_removes_nested_booking_urls() -> None:
    value = {
        "bookingUrl": "root",
        "items": [
            {
                "hotelId": 1,
                "bookingUrl": "nested",
                "children": [{"bookingUrl": "deep", "name": "x"}],
            }
        ],
    }

    assert remove_field(value, "bookingUrl") == {
        "items": [
            {
                "hotelId": 1,
                "children": [{"name": "x"}],
            }
        ],
    }
