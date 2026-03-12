from __future__ import annotations

from typing import Annotated

import typer

from .api import request_api, resolve_api_key
from .constants import DEFAULT_BASE_URL
from .errors import ApiRequestError, CliValidationError
from .models import OutputFormat, build_hotel_detail_payload, build_search_hotels_payload, parse_star_ratings
from .output import print_json, print_search_table, remove_field

AI_HELP_TEXT = (
    "RollingGo hotel CLI.\n\n"
    "Recommended for AI agents: call standard subcommands with structured options, "
    "for example `rollinggo search-hotels --place ... --place-type ...`. "
    "Results are written to stdout as JSON by default.\n\n"
    "Parameter discovery: use `rollinggo <command> --help` to inspect required options, "
    "accepted value formats, and command examples."
)

SEARCH_HOTELS_EXAMPLE = (
    "Minimal example:\n"
    "  rollinggo search-hotels --api-key <key> --origin-query \"Find hotels near Tokyo Disneyland\" "
    "--place \"Tokyo Disneyland\" --place-type \"景点\""
)

HOTEL_DETAIL_EXAMPLE = (
    "Example:\n"
    "  rollinggo hotel-detail --api-key <key> --hotel-id 123456 "
    "--check-in-date 2026-04-01 --check-out-date 2026-04-03"
)

HOTEL_TAGS_EXAMPLE = (
    "Example:\n"
    "  rollinggo hotel-tags --api-key <key>"
)

app = typer.Typer(
    no_args_is_help=True,
    add_completion=False,
    help=AI_HELP_TEXT,
)


def _handle_error(exc: Exception, exit_code: int) -> None:
    typer.echo(str(exc), err=True)
    raise typer.Exit(code=exit_code) from exc


def _resolve_format(output_format: OutputFormat, *, allow_table: bool) -> OutputFormat:
    if output_format == "table" and not allow_table:
        raise CliValidationError("--format table is only supported by search-hotels.")
    return output_format


@app.command(
    "search-hotels",
    help="Search hotels with structured filters.",
    epilog=SEARCH_HOTELS_EXAMPLE,
)
def search_hotels(
    origin_query: Annotated[
        str,
        typer.Option(
            "--origin-query",
            help="User's original natural-language request. Used for semantic understanding and ranking.",
        ),
    ],
    place: Annotated[
        str,
        typer.Option(
            "--place",
            help=(
                "Single resolvable destination text, such as a city, airport, hotel, POI, or full address. "
                "Examples: Beijing, Shanghai Pudong International Airport, Tokyo Disneyland."
            ),
        ),
    ],
    place_type: Annotated[
        str,
        typer.Option(
            "--place-type",
            help=(
                "Destination type. Supported values: 城市, 机场, 景点, 火车站, 地铁站, 酒店, 区/县, 详细地址. "
                "Must match the semantics of --place."
            ),
        ),
    ],
    api_key: Annotated[
        str | None,
        typer.Option(
            "--api-key",
            help="RollingGo API key. If omitted, the CLI falls back to AIGOHOTEL_API_KEY.",
        ),
    ] = None,
    base_url: Annotated[
        str,
        typer.Option(
            "--base-url",
            help="Base URL for the RollingGo hotel API. Override only for testing or private deployments.",
        ),
    ] = DEFAULT_BASE_URL,
    output_format: Annotated[
        OutputFormat,
        typer.Option(
            "--format",
            help="Output format. Use json for machine parsing. table is only supported on search-hotels.",
        ),
    ] = "json",
    country_code: Annotated[
        str | None,
        typer.Option(
            "--country-code",
            help="Optional ISO 3166-1 alpha-2 country code such as CN, US, or JP. Useful when place names are ambiguous.",
        ),
    ] = None,
    size: Annotated[
        int,
        typer.Option(
            "--size",
            help="Maximum number of hotel results to return. Recommended range: 5-20. Default: 5.",
        ),
    ] = 5,
    check_in_date: Annotated[
        str | None,
        typer.Option(
            "--check-in-date",
            help="Check-in date in YYYY-MM-DD format. Should be a valid future date.",
        ),
    ] = None,
    stay_nights: Annotated[
        int | None,
        typer.Option(
            "--stay-nights",
            help="Number of nights to stay. Integer >= 1. Default becomes 1 when any check-in parameters are sent.",
        ),
    ] = None,
    adult_count: Annotated[
        int | None,
        typer.Option(
            "--adult-count",
            help="Adults per room. Integer >= 1. Default becomes 2 when occupancy is sent.",
        ),
    ] = None,
    distance_in_meter: Annotated[
        int | None,
        typer.Option(
            "--distance-in-meter",
            help="Distance cap in meters. Only meaningfully applies to POI-style places such as 景点.",
        ),
    ] = None,
    star_ratings: Annotated[
        str | None,
        typer.Option(
            "--star-ratings",
            help="Star range in min,max form. Each value must be between 0.0 and 5.0 in 0.5 increments, for example 4.0,5.0.",
        ),
    ] = None,
    preferred_tags: Annotated[
        list[str] | None,
        typer.Option(
            "--preferred-tag",
            help="Soft preference tag. Repeat this option to pass multiple preferred tags.",
        ),
    ] = None,
    required_tags: Annotated[
        list[str] | None,
        typer.Option(
            "--required-tag",
            help="Hard filter tag. Hotels missing any required tag should be filtered out. Repeat for multiple values.",
        ),
    ] = None,
    excluded_tags: Annotated[
        list[str] | None,
        typer.Option(
            "--excluded-tag",
            help="Exclusion tag. Matching hotels should be filtered out. Repeat for multiple values.",
        ),
    ] = None,
    preferred_brands: Annotated[
        list[str] | None,
        typer.Option(
            "--preferred-brand",
            help="Preferred hotel brand. Soft preference only. Repeat for multiple values.",
        ),
    ] = None,
    max_price_per_night: Annotated[
        float | None,
        typer.Option(
            "--max-price-per-night",
            help="Maximum nightly price in CNY.",
        ),
    ] = None,
    min_room_size: Annotated[
        float | None,
        typer.Option(
            "--min-room-size",
            help="Minimum room area in square meters.",
        ),
    ] = None,
) -> None:
    try:
        output_format = _resolve_format(output_format, allow_table=True)
        payload = build_search_hotels_payload(
            origin_query=origin_query,
            place=place,
            place_type=place_type,
            country_code=country_code,
            size=size,
            check_in_date=check_in_date,
            stay_nights=stay_nights,
            adult_count=adult_count,
            distance_in_meter=distance_in_meter,
            star_ratings=parse_star_ratings(star_ratings),
            preferred_tags=preferred_tags,
            required_tags=required_tags,
            excluded_tags=excluded_tags,
            preferred_brands=preferred_brands,
            max_price_per_night=max_price_per_night,
            min_room_size=min_room_size,
        )
        result = remove_field(
            request_api(
                "POST",
                "/hotelsearch",
                resolve_api_key(api_key),
                base_url=base_url,
                payload=payload,
            ),
            "bookingUrl",
        )
        if output_format == "table":
            print_search_table(result)
        else:
            print_json(result)
    except CliValidationError as exc:
        _handle_error(exc, 2)
    except ApiRequestError as exc:
        _handle_error(exc, 1)


@app.command(
    "hotel-detail",
    help="Fetch hotel detail and room pricing with structured options.",
    epilog=HOTEL_DETAIL_EXAMPLE,
)
def hotel_detail(
    hotel_id: Annotated[
        int | None,
        typer.Option(
            "--hotel-id",
            help="Hotel unique ID. Use this when available. Mutually exclusive with --name.",
        ),
    ] = None,
    name: Annotated[
        str | None,
        typer.Option(
            "--name",
            help="Hotel name for fuzzy matching. Use only when --hotel-id is unavailable.",
        ),
    ] = None,
    api_key: Annotated[
        str | None,
        typer.Option(
            "--api-key",
            help="RollingGo API key. If omitted, the CLI falls back to AIGOHOTEL_API_KEY.",
        ),
    ] = None,
    base_url: Annotated[
        str,
        typer.Option(
            "--base-url",
            help="Base URL for the RollingGo hotel API. Override only for testing or private deployments.",
        ),
    ] = DEFAULT_BASE_URL,
    output_format: Annotated[
        OutputFormat,
        typer.Option(
            "--format",
            help="Output format. hotel-detail currently supports json only.",
        ),
    ] = "json",
    check_in_date: Annotated[
        str | None,
        typer.Option(
            "--check-in-date",
            help="Check-in date in YYYY-MM-DD format.",
        ),
    ] = None,
    check_out_date: Annotated[
        str | None,
        typer.Option(
            "--check-out-date",
            help="Check-out date in YYYY-MM-DD format and must be later than --check-in-date.",
        ),
    ] = None,
    adult_count: Annotated[
        int | None,
        typer.Option(
            "--adult-count",
            help="Adults per room. Integer >= 1. Default becomes 2 when occupancy is sent.",
        ),
    ] = None,
    child_count: Annotated[
        int | None,
        typer.Option(
            "--child-count",
            help="Children per room. Integer >= 0. Must match the number of --child-age values.",
        ),
    ] = None,
    child_age: Annotated[
        list[int] | None,
        typer.Option(
            "--child-age",
            help="Child age value. Repeat this option once per child, for example --child-age 3 --child-age 5.",
        ),
    ] = None,
    room_count: Annotated[
        int | None,
        typer.Option(
            "--room-count",
            help="Number of rooms. Integer >= 1. Default becomes 1 when occupancy is sent.",
        ),
    ] = None,
    country_code: Annotated[
        str | None,
        typer.Option(
            "--country-code",
            help="ISO 3166-1 alpha-2 country code for locale selection. Defaults to CN when locale is sent.",
        ),
    ] = None,
    currency: Annotated[
        str | None,
        typer.Option(
            "--currency",
            help="ISO 4217 currency code such as CNY or USD. Defaults to CNY when locale is sent.",
        ),
    ] = None,
) -> None:
    try:
        _resolve_format(output_format, allow_table=False)
        payload = build_hotel_detail_payload(
            hotel_id=hotel_id,
            name=name,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            adult_count=adult_count,
            child_count=child_count,
            child_age=child_age,
            room_count=room_count,
            country_code=country_code,
            currency=currency,
        )
        result = remove_field(
            request_api(
                "POST",
                "/hoteldetail",
                resolve_api_key(api_key),
                base_url=base_url,
                payload=payload,
            ),
            "bookingUrl",
        )
        print_json(result)
    except CliValidationError as exc:
        _handle_error(exc, 2)
    except ApiRequestError as exc:
        _handle_error(exc, 1)


@app.command(
    "hotel-tags",
    help="Fetch hotel tag metadata as JSON.",
    epilog=HOTEL_TAGS_EXAMPLE,
)
def hotel_tags(
    api_key: Annotated[
        str | None,
        typer.Option(
            "--api-key",
            help="RollingGo API key. If omitted, the CLI falls back to AIGOHOTEL_API_KEY.",
        ),
    ] = None,
    base_url: Annotated[
        str,
        typer.Option(
            "--base-url",
            help="Base URL for the RollingGo hotel API. Override only for testing or private deployments.",
        ),
    ] = DEFAULT_BASE_URL,
    output_format: Annotated[
        OutputFormat,
        typer.Option(
            "--format",
            help="Output format. hotel-tags currently supports json only.",
        ),
    ] = "json",
) -> None:
    try:
        _resolve_format(output_format, allow_table=False)
        result = remove_field(
            request_api("GET", "/hoteltags", resolve_api_key(api_key), base_url=base_url),
            "bookingUrl",
        )
        print_json(result)
    except CliValidationError as exc:
        _handle_error(exc, 2)
    except ApiRequestError as exc:
        _handle_error(exc, 1)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
