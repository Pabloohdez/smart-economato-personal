const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOptionalEmail(value: string | null | undefined): string | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized ? normalized : undefined;
}

export function isValidOptionalEmail(value: string | null | undefined): boolean {
  const normalized = normalizeOptionalEmail(value);
  return normalized ? EMAIL_REGEX.test(normalized) : true;
}