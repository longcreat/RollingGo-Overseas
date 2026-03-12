from __future__ import annotations

from typing import Any


def remove_field(value: Any, field_name: str) -> Any:
    if isinstance(value, dict):
        return {
            key: remove_field(item, field_name)
            for key, item in value.items()
            if key != field_name
        }
    if isinstance(value, list):
        return [remove_field(item, field_name) for item in value]
    return value
