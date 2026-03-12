import Table from "cli-table3";

import { SEARCH_TABLE_COLUMNS } from "./constants.js";

export function removeField(data: unknown, fieldName: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => removeField(item, fieldName));
  }

  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>)
        .filter(([key]) => key !== fieldName)
        .map(([key, value]) => [key, removeField(value, fieldName)]),
    );
  }

  return data;
}

export function renderJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function findHotelRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if ("hotelId" in record || "name" in record) {
      return [record];
    }

    for (const key of ["data", "hotels", "hotelList", "items", "results", "list"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
      }
      if (value && typeof value === "object") {
        const nested = findHotelRows(value);
        if (nested.length > 0) {
          return nested;
        }
      }
    }

    for (const value of Object.values(record)) {
      const nested = findHotelRows(value);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

export function renderSearchTable(data: unknown): string {
  const table = new Table({
    head: SEARCH_TABLE_COLUMNS.map(([header]) => header),
  });

  for (const row of findHotelRows(data)) {
    table.push(SEARCH_TABLE_COLUMNS.map(([, key]) => String(row[key] ?? "")));
  }

  return `${table.toString()}\n`;
}
