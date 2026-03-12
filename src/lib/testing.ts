export function makeDigestDate(offsetDays = 0) {
  const value = new Date(Date.UTC(2026, 2, 12 + offsetDays, 0, 0, 0));
  return value.toISOString().slice(0, 10);
}
