import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const COUNTRY_TO_REGION: Record<
  string,
  CountryCode
> = {
  US: "US",
  GB: "GB",
  UK: "GB",

  // Common EU countries
  AT: "AT",
  BE: "BE",
  BG: "BG",
  HR: "HR",
  CY: "CY",
  CZ: "CZ",
  DK: "DK",
  EE: "EE",
  FI: "FI",
  FR: "FR",
  DE: "DE",
  GR: "GR",
  HU: "HU",
  IE: "IE",
  IT: "IT",
  LV: "LV",
  LT: "LT",
  LU: "LU",
  MT: "MT",
  NL: "NL",
  PL: "PL",
  PT: "PT",
  RO: "RO",
  SK: "SK",
  SI: "SI",
  ES: "ES",
  SE: "SE",
};

function getDefaultRegion(
  country?: string
): CountryCode {
  const normalizedCountry = country
    ?.trim()
    .toUpperCase();

  if (!normalizedCountry) {
    return "US";
  }

  return (
    COUNTRY_TO_REGION[normalizedCountry] ??
    "US"
  );
}

/**
 * Converts common spoken/transcribed phone-number
 * formats into something libphonenumber-js can parse.
 *
 * Examples:
 * "555 123 4567"       -> "5551234567"
 * "(555) 123-4567"     -> "5551234567"
 * "555-123-4567"       -> "5551234567"
 * "+1 555 123 4567"    -> "+15551234567"
 *
 * We intentionally keep "+" because it is meaningful
 * for international numbers.
 */
function cleanPhoneInput(phone: string): string {
  const normalized = phone
    .trim()
    .replace(/[^\d+]/g, "");

  if (!normalized) {
    throw new Error(
      "Phone number must contain digits."
    );
  }

  // A "+" is only valid at the beginning.
  if (
    normalized.includes("+") &&
    !normalized.startsWith("+")
  ) {
    throw new Error(
      "Invalid phone number."
    );
  }

  return normalized;
}

export function normalizePhone(
  phone: string,
  country?: string
): string {
  if (typeof phone !== "string") {
    throw new Error(
      "Phone number is required."
    );
  }

  const trimmed = phone.trim();

  if (!trimmed) {
    throw new Error(
      "Phone number is required."
    );
  }

  const defaultRegion =
    getDefaultRegion(country);

  const cleanedPhone =
    cleanPhoneInput(trimmed);

  const parsed =
    parsePhoneNumberFromString(
      cleanedPhone,
      defaultRegion
    );

  if (!parsed) {
    throw new Error(
      "Invalid phone number."
    );
  }

  if (!parsed.isValid()) {
    throw new Error(
      "Invalid phone number."
    );
  }

  return parsed.number;
}