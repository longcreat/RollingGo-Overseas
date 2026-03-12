import { CommanderError } from "commander";
import { describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../src/errors.js";
import { createProgram } from "../src/program.js";

async function runProgram(argv: string[], requestApiImpl = vi.fn()) {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const program = createProgram({
    stdout: (text) => {
      stdout.push(text);
    },
    stderr: (text) => {
      stderr.push(text);
    },
    requestApiImpl: requestApiImpl as any,
  });

  try {
    await program.parseAsync(argv, { from: "user" });
    return { stdout: stdout.join(""), stderr: stderr.join(""), code: 0 };
  } catch (error) {
    if (error instanceof CommanderError) {
      return {
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        code: error.exitCode,
        message: error.message,
      };
    }
    throw error;
  }
}

describe("CLI", () => {
  it("renders top-level help", async () => {
    const result = await runProgram(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("search-hotels");
    expect(result.stdout).toContain("Recommended for AI agents");
  });

  it("renders help when no args are provided", async () => {
    const result = await runProgram([]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("RollingGo hotel CLI.");
    expect(result.stdout).toContain("search-hotels");
  });

  it("renders detailed search help", async () => {
    const result = await runProgram(["search-hotels", "--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Minimal example");
    expect(result.stdout).toContain("rollinggo search-hotels");
    expect(result.stdout).toContain("Destination type.");
    expect(result.stdout).toContain("0.0 and 5.0");
  });

  it("renders detailed hotel-detail help", async () => {
    const result = await runProgram(["hotel-detail", "--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("--hotel-id <hotelId>");
    expect(result.stdout).toContain("exclusive with --name");
    expect(result.stdout).toContain("--child-age 3 --child-age 5");
  });

  it("renders detailed hotel-tags help", async () => {
    const result = await runProgram(["hotel-tags", "--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Fetch hotel tag metadata.");
    expect(result.stdout).toContain("AIGOHOTEL_API_KEY");
  });

  it("renders search table output", async () => {
    const requestApiImpl = vi.fn().mockResolvedValue({
      items: [
        {
          hotelId: 1,
          name: "Alpha",
          starRating: 4.5,
          price: 999,
          currency: "CNY",
          areaCode: "CN",
          address: "Shanghai",
        },
      ],
    });

    const result = await runProgram(
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
      requestApiImpl,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).toContain("hotelId");
  });

  it("rejects table format on unsupported commands", async () => {
    const result = await runProgram([
      "hotel-tags",
      "--api-key",
      "cli-key",
      "--format",
      "table",
    ]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only supported by search-hotels");
  });

  it("returns exit code 2 for missing required search args", async () => {
    const result = await runProgram(["search-hotels", "--api-key", "cli-key"]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--origin-query");
  });

  it("prints pure JSON to stdout by default", async () => {
    const requestApiImpl = vi.fn().mockResolvedValue({
      items: [
        {
          hotelId: 1,
          name: "Alpha",
          bookingUrl: "secret",
        },
      ],
    });

    const result = await runProgram(
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
      requestApiImpl,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe('{\n  "items": [\n    {\n      "hotelId": 1,\n      "name": "Alpha"\n    }\n  ]\n}\n');
  });

  it("returns exit code 1 for API failures", async () => {
    const result = await runProgram(
      ["hotel-tags", "--api-key", "cli-key"],
      vi.fn().mockRejectedValue(new ApiRequestError("server down")),
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("server down");
  });
});
