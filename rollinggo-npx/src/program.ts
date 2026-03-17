import { Command, CommanderError, Option } from "commander";

import { resolveApiKey } from "./auth.js";
import { requestApi } from "./client.js";
import { DEFAULT_BASE_URL } from "./constants.js";
import { ApiRequestError, CliValidationError } from "./errors.js";
import {
  type OutputFormat,
  buildHotelDetailPayload,
  buildSearchHotelsPayload,
  outputFormatSchema,
  parseStarRatings,
} from "./payloads.js";
import { renderJson, renderSearchTable } from "./output.js";

const AI_HELP_TEXT = [
  "Recommended for AI agents: call standard subcommands with structured options,",
  "for example `rollinggo search-hotels --place ... --place-type ...`.",
  "Results are written to stdout as JSON by default.",
  "",
  "Parameter discovery: use `rollinggo <command> --help` to inspect required options,",
  "accepted value formats, and command examples.",
].join("\n");

const SEARCH_HOTELS_EXAMPLE = [
  "Minimal example:",
  "  rollinggo search-hotels --api-key <key> --origin-query \"Find hotels near Tokyo Disneyland\" --place \"Tokyo Disneyland\" --place-type \"景点\"",
].join("\n");

const HOTEL_DETAIL_EXAMPLE = [
  "Example:",
  "  rollinggo hotel-detail --api-key <key> --hotel-id 123456 --check-in-date 2026-04-01 --check-out-date 2026-04-03",
].join("\n");

const HOTEL_TAGS_EXAMPLE = [
  "Example:",
  "  rollinggo hotel-tags --api-key <key>",
].join("\n");

const COMMANDER_VALIDATION_CODES = new Set([
  "commander.missingMandatoryOptionValue",
  "commander.missingArgument",
  "commander.optionMissingArgument",
  "commander.unknownOption",
  "commander.excessArguments",
  "commander.unknownCommand",
  "commander.invalidArgument",
]);

export type ProgramDeps = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  requestApiImpl: typeof requestApi;
};

function createOptionCollector() {
  return (value: string, previous: string[] = []) => [...previous, value];
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new CliValidationError(`Expected an integer but received ${value}.`);
  }
  return parsed;
}

function parseFloatValue(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new CliValidationError(`Expected a number but received ${value}.`);
  }
  return parsed;
}

function fail(message: string, exitCode: number): never {
  throw new CommanderError(exitCode, "rollinggo.error", message);
}

function ensureFormat(format: string, allowTable: boolean): OutputFormat {
  const parsed = outputFormatSchema.safeParse(format);
  if (!parsed.success) {
    throw new CliValidationError("Output format must be json or table.");
  }
  if (parsed.data === "table" && !allowTable) {
    throw new CliValidationError("--format table is only supported by search-hotels.");
  }
  return parsed.data;
}

function sharedOptions(command: Command): Command {
  return command
    .addOption(
      new Option(
        "--api-key <apiKey>",
        "RollingGo API key. If omitted, the CLI falls back to AIGOHOTEL_API_KEY.",
      ),
    )
    .addOption(
      new Option(
        "--base-url <url>",
        "Base URL for the RollingGo hotel API. Override only for testing or private deployments.",
      ).default(DEFAULT_BASE_URL),
    )
    .addOption(
      new Option(
        "--format <format>",
        "Output format. Use json for machine parsing. table is only supported on search-hotels.",
      ).default("json"),
    );
}

export function createProgram(
  deps: Partial<ProgramDeps> = {},
): Command {
  const stdout = deps.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text: string) => process.stderr.write(text));
  const requestApiImpl = deps.requestApiImpl ?? requestApi;

  const program = new Command();
  program
    .name("rollinggo")
    .description("RollingGo hotel CLI.")
    .addHelpText("after", `\n${AI_HELP_TEXT}\n`)
    .showHelpAfterError()
    .exitOverride((error) => {
      if (COMMANDER_VALIDATION_CODES.has(error.code)) {
        throw new CommanderError(2, error.code, error.message);
      }
      throw error;
    })
    .action(() => {
      stdout(program.helpInformation());
      throw new CommanderError(0, "commander.helpDisplayed", "(outputHelp)");
    });

  sharedOptions(
    program
      .command("search-hotels")
      .description("Search hotels with structured filters.")
      .addHelpText("after", `\n${SEARCH_HOTELS_EXAMPLE}\n`)
      .requiredOption(
        "--origin-query <query>",
        "User's original natural-language request. Used for semantic understanding and ranking.",
      )
      .requiredOption(
        "--place <place>",
        "Single resolvable destination text, such as a city, airport, hotel, POI, or full address. Examples: Beijing, Shanghai Pudong International Airport, Tokyo Disneyland.",
      )
      .requiredOption(
        "--place-type <type>",
        "Destination type. Supported values: 城市, 机场, 景点, 火车站, 地铁站, 酒店, 区/县, 详细地址. Must match the semantics of --place.",
      )
      .option(
        "--country-code <code>",
        "Optional ISO 3166-1 alpha-2 country code such as CN, US, or JP. Useful when place names are ambiguous.",
      )
      .option(
        "--size <size>",
        "Maximum number of hotel results to return. Recommended range: 5-20. Default: 5.",
        parseInteger,
        5,
      )
      .option(
        "--check-in-date <date>",
        "Check-in date in YYYY-MM-DD format. Should be a valid future date.",
      )
      .option(
        "--stay-nights <nights>",
        "Number of nights to stay. Integer >= 1. Default becomes 1 when any check-in parameters are sent.",
        parseInteger,
      )
      .option(
        "--adult-count <count>",
        "Adults per room. Integer >= 1. Default becomes 2 when occupancy is sent.",
        parseInteger,
      )
      .option(
        "--distance-in-meter <distance>",
        "Distance cap in meters. Only meaningfully applies to POI-style places such as 景点.",
        parseInteger,
      )
      .option(
        "--star-ratings <min,max>",
        "Star range in min,max form. Each value must be between 0.0 and 5.0 in 0.5 increments, for example 4.0,5.0.",
      )
      .option(
        "--preferred-tag <tag>",
        "Soft preference tag. Repeat this option to pass multiple preferred tags.",
        createOptionCollector(),
        [],
      )
      .option(
        "--required-tag <tag>",
        "Hard filter tag. Hotels missing any required tag should be filtered out. Repeat for multiple values.",
        createOptionCollector(),
        [],
      )
      .option(
        "--excluded-tag <tag>",
        "Exclusion tag. Matching hotels should be filtered out. Repeat for multiple values.",
        createOptionCollector(),
        [],
      )
      .option(
        "--preferred-brand <brand>",
        "Preferred hotel brand. Soft preference only. Repeat for multiple values.",
        createOptionCollector(),
        [],
      )
      .option("--max-price-per-night <value>", "Maximum nightly price in CNY.", parseFloatValue)
      .option("--min-room-size <value>", "Minimum room area in square meters.", parseFloatValue)
      .action(async (options) => {
        try {
          const format = ensureFormat(options.format, true);
          const payload = buildSearchHotelsPayload({
            originQuery: options.originQuery,
            place: options.place,
            placeType: options.placeType,
            countryCode: options.countryCode,
            size: options.size,
            checkInDate: options.checkInDate,
            stayNights: options.stayNights,
            adultCount: options.adultCount,
            distanceInMeter: options.distanceInMeter,
            starRatings: parseStarRatings(options.starRatings),
            preferredTags: options.preferredTag,
            requiredTags: options.requiredTag,
            excludedTags: options.excludedTag,
            preferredBrands: options.preferredBrand,
            maxPricePerNight: options.maxPricePerNight,
            minRoomSize: options.minRoomSize,
          });
          const response = await requestApiImpl(
            "POST",
            "/hotelsearch",
            resolveApiKey(options.apiKey),
            { baseUrl: options.baseUrl, payload },
          );
          stdout(format === "table" ? renderSearchTable(response) : renderJson(response));
        } catch (error) {
          if (error instanceof CliValidationError) {
            stderr(`${error.message}\n`);
            fail(error.message, 2);
          }
          if (error instanceof ApiRequestError) {
            stderr(`${error.message}\n`);
            fail(error.message, 1);
          }
          throw error;
        }
      }),
  );

  sharedOptions(
    program
      .command("hotel-detail")
      .description("Fetch hotel detail and room pricing.")
      .addHelpText("after", `\n${HOTEL_DETAIL_EXAMPLE}\n`)
      .option(
        "--hotel-id <hotelId>",
        "Hotel unique ID. Use this when available. Mutually exclusive with --name.",
        parseInteger,
      )
      .option(
        "--name <name>",
        "Hotel name for fuzzy matching. Use only when --hotel-id is unavailable.",
      )
      .option("--check-in-date <date>", "Check-in date in YYYY-MM-DD format.")
      .option(
        "--check-out-date <date>",
        "Check-out date in YYYY-MM-DD format and must be later than --check-in-date.",
      )
      .option(
        "--adult-count <count>",
        "Adults per room. Integer >= 1. Default becomes 2 when occupancy is sent.",
        parseInteger,
      )
      .option(
        "--child-count <count>",
        "Children per room. Integer >= 0. Must match the number of --child-age values.",
        parseInteger,
      )
      .option(
        "--child-age <age>",
        "Child age value. Repeat this option once per child, for example --child-age 3 --child-age 5.",
        (value: string, previous: number[] = []) => [...previous, parseInteger(value)],
        [],
      )
      .option(
        "--room-count <count>",
        "Number of rooms. Integer >= 1. Default becomes 1 when occupancy is sent.",
        parseInteger,
      )
      .option(
        "--country-code <code>",
        "ISO 3166-1 alpha-2 country code for locale selection. Defaults to CN when locale is sent.",
      )
      .option(
        "--currency <code>",
        "ISO 4217 currency code such as CNY or USD. Defaults to CNY when locale is sent.",
      )
      .action(async (options) => {
        try {
          ensureFormat(options.format, false);
          const payload = buildHotelDetailPayload({
            hotelId: options.hotelId,
            name: options.name,
            checkInDate: options.checkInDate,
            checkOutDate: options.checkOutDate,
            adultCount: options.adultCount,
            childCount: options.childCount,
            childAge: options.childAge,
            roomCount: options.roomCount,
            countryCode: options.countryCode,
            currency: options.currency,
          });
          const response = await requestApiImpl(
            "POST",
            "/hoteldetail",
            resolveApiKey(options.apiKey),
            { baseUrl: options.baseUrl, payload },
          );
          stdout(renderJson(response));
        } catch (error) {
          if (error instanceof CliValidationError) {
            stderr(`${error.message}\n`);
            fail(error.message, 2);
          }
          if (error instanceof ApiRequestError) {
            stderr(`${error.message}\n`);
            fail(error.message, 1);
          }
          throw error;
        }
      }),
  );

  sharedOptions(
    program
      .command("hotel-tags")
      .description("Fetch hotel tag metadata.")
      .addHelpText("after", `\n${HOTEL_TAGS_EXAMPLE}\n`)
      .action(async (options) => {
        try {
          ensureFormat(options.format, false);
          const response = await requestApiImpl(
            "GET",
            "/hoteltags",
            resolveApiKey(options.apiKey),
            { baseUrl: options.baseUrl },
          );
          stdout(renderJson(response));
        } catch (error) {
          if (error instanceof CliValidationError) {
            stderr(`${error.message}\n`);
            fail(error.message, 2);
          }
          if (error instanceof ApiRequestError) {
            stderr(`${error.message}\n`);
            fail(error.message, 1);
          }
          throw error;
        }
      }),
  );

  program.configureOutput({
    writeOut: (text) => stdout(text),
    writeErr: (text) => stderr(text),
  });

  return program;
}
