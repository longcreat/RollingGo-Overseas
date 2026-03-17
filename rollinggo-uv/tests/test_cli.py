import json

from typer.testing import CliRunner

from rollinggo_cli.cli import app
from rollinggo_cli.errors import ApiRequestError

runner = CliRunner()


def test_help_renders() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "search-hotels" in result.stdout
    assert "Recommended for AI agents" in result.stdout


def test_search_hotels_table_output(monkeypatch) -> None:
    monkeypatch.setattr(
        "rollinggo_cli.cli.request_api",
        lambda *args, **kwargs: {
            "items": [
                {
                    "hotelId": 1,
                    "name": "Alpha",
                    "starRating": 4.5,
                    "price": 999,
                    "currency": "CNY",
                    "areaCode": "CN",
                    "address": "Shanghai",
                }
            ]
        },
    )

    result = runner.invoke(
        app,
        [
            "search-hotels",
            "--api-key",
            "cli-key",
            "--origin-query",
            "Need a hotel",
            "--place",
            "Shanghai",
            "--place-type",
            "城市",
            "--format",
            "table",
        ],
    )

    assert result.exit_code == 0
    assert "Alpha" in result.stdout
    assert "hotelId" in result.stdout


def test_search_hotels_help_contains_minimal_example() -> None:
    result = runner.invoke(app, ["search-hotels", "--help"])
    assert result.exit_code == 0
    assert "Minimal example" in result.stdout
    assert "rollinggo search-hotels" in result.stdout
    assert "--place-type" in result.stdout
    assert "Destination type." in result.stdout
    assert "Star range in min,max form." in result.stdout
    assert "0.0 and 5.0" in result.stdout


def test_hotel_detail_help_renders() -> None:
    result = runner.invoke(app, ["hotel-detail", "--help"])
    assert result.exit_code == 0
    assert "--hotel-id" in result.stdout
    assert "Mutually exclusive" in result.stdout
    assert "--child-age 3 --child-age 5" in result.stdout


def test_hotel_tags_help_renders() -> None:
    result = runner.invoke(app, ["hotel-tags", "--help"])
    assert result.exit_code == 0
    assert "Fetch hotel tag metadata as JSON." in result.stdout
    assert "falls back to AIGOHOTEL_API_KEY" in result.stdout


def test_non_search_table_format_fails() -> None:
    result = runner.invoke(
        app,
        [
            "hotel-tags",
            "--api-key",
            "cli-key",
            "--format",
            "table",
        ],
    )

    assert result.exit_code == 2
    assert "only supported by search-hotels" in result.stderr


def test_search_hotels_missing_required_args_returns_exit_code_two() -> None:
    result = runner.invoke(app, ["search-hotels", "--api-key", "cli-key"])
    assert result.exit_code == 2
    assert "--origin-query" in result.stderr


def test_search_hotels_default_stdout_is_pure_json(monkeypatch) -> None:
    monkeypatch.setattr(
        "rollinggo_cli.cli.request_api",
        lambda *args, **kwargs: {
            "items": [
                {
                    "hotelId": 1,
                    "name": "Alpha",
                    "bookingUrl": "secret",
                }
            ]
        },
    )

    result = runner.invoke(
        app,
        [
            "search-hotels",
            "--api-key",
            "cli-key",
            "--origin-query",
            "Need a hotel",
            "--place",
            "Shanghai",
            "--place-type",
            "城市",
        ],
    )

    assert result.exit_code == 0
    assert result.stderr == ""
    payload = json.loads(result.stdout)
    assert payload == {"items": [{"hotelId": 1, "name": "Alpha", "bookingUrl": "secret"}]}


def test_hotel_detail_identifier_validation_returns_exit_code_two() -> None:
    result = runner.invoke(
        app,
        [
            "hotel-detail",
            "--api-key",
            "cli-key",
        ],
    )

    assert result.exit_code == 2
    assert "hotel_id or name" in result.stderr


def test_api_errors_return_exit_code_one(monkeypatch) -> None:
    monkeypatch.setattr(
        "rollinggo_cli.cli.request_api",
        lambda *args, **kwargs: (_ for _ in ()).throw(ApiRequestError("server down")),
    )

    result = runner.invoke(
        app,
        [
            "hotel-tags",
            "--api-key",
            "cli-key",
        ],
    )

    assert result.exit_code == 1
    assert "server down" in result.stderr
