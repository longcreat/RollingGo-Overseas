from typing import Any


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
