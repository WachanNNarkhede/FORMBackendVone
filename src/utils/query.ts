// Express's query parser can turn `?status[$ne]=x` into an object, which — if
// passed straight into a Mongo filter — enables NoSQL operator injection.
// Coerce every user-supplied query value to a plain string before use.
export function qStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Parse a positive integer query param with a fallback.
export function qInt(v: unknown, fallback: number): number {
  const n = parseInt(typeof v === "string" ? v : "", 10);
  return Number.isFinite(n) ? n : fallback;
}
