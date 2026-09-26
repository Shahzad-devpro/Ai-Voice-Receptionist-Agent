export function formatBusinessDateTime(
  value: string,
  timezone: string,
  locale: string
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBusinessDate(
  value: string,
  timezone: string,
  locale: string
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatBusinessTime(
  value: string,
  timezone: string,
  locale: string
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    timeStyle: "short",
  }).format(new Date(value));
}

