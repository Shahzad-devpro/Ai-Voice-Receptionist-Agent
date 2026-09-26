export function normalizePhone(phone: string): string {
  if (typeof phone !== "string") {
    throw new Error("Phone number is required.");
  }

  const trimmed = phone.trim();

  if (!trimmed) {
    throw new Error("Phone number is required.");
  }

  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    throw new Error(
      "Phone number must contain digits."
    );
  }

  // US 10-digit number:
  // 2125559876 -> +12125559876
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US number with country code:
  // 12125559876 -> +12125559876
  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  // Already supplied as an international number.
  // Example: +442071234567
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  throw new Error(
    "Invalid phone number. Please provide a 10-digit US number or include the country code."
  );
}