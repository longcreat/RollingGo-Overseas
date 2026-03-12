from __future__ import annotations

import json
import sys
from typing import Any

from rich.console import Console
from rich.table import Table

from .constants import SEARCH_TABLE_COLUMNS


def remove_field(data: Any, field_name: str) -> Any:
    if isinstance(data, dict):
        return {
            key: remove_field(value, field_name)
            for key, value in data.items()
            if key != field_name
        }
    if isinstance(data, list):
        return [remove_field(item, field_name) for item in data]
    return data


def print_json(data: Any) -> None:
    sys.stdout.write(json.dumps(data, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


def _find_hotel_rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]

    if isinstance(data, dict):
        if "hotelId" in data or "name" in data:
            return [data]

        for key in ("data", "hotels", "hotelList", "items", "results", "list"):
            value = data.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]
            if isinstance(value, dict):
                nested_rows = _find_hotel_rows(value)
                if nested_rows:
                    return nested_rows

        for value in data.values():
            nested_rows = _find_hotel_rows(value)
            if nested_rows:
                return nested_rows

    return []


def print_search_table(data: Any) -> None:
    table = Table()
    for header, _ in SEARCH_TABLE_COLUMNS:
        table.add_column(header)

    for row in _find_hotel_rows(data):
        table.add_row(*[str(row.get(key, "")) for _, key in SEARCH_TABLE_COLUMNS])

    console = Console(file=sys.stdout)
    console.print(table)
