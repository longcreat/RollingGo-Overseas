export function removeField(value: unknown, fieldName: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => removeField(item, fieldName));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== fieldName)
        .map(([key, item]) => [key, removeField(item, fieldName)]),
    );
  }

  return value;
}
