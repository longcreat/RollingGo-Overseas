import { DEFAULT_BASE_URL } from "./constants.js";
import { ApiRequestError } from "./errors.js";

export function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export async function requestApi(
  method: string,
  endpoint: string,
  apiKey: string,
  options: {
    baseUrl?: string;
    payload?: unknown;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  if (method.toUpperCase() === "POST") {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetchImpl(`${normalizeBaseUrl(options.baseUrl)}${endpoint}`, {
      method: method.toUpperCase(),
      headers,
      body: options.payload ? JSON.stringify(options.payload) : undefined,
    });
  } catch (error) {
    throw new ApiRequestError(`HTTP request failed: ${String(error)}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiRequestError(
      `HTTP request failed with status ${response.status}: ${body || response.statusText}`,
    );
  }

  return response.json();
}
