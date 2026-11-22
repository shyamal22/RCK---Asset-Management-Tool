/** Password guidance shown as people type (inline validation), plus a memorable suggestion. */

// The most-used passwords plus NZ/trade favourites. Lowercased, compared without trailing digits/symbols.
const COMMON = new Set([
  "password", "passw0rd", "123456", "12345678", "123456789", "1234567890", "qwerty", "qwertyuiop", "111111", "abc123",
  "iloveyou", "letmein", "welcome", "admin", "monkey", "dragon", "football", "rugby", "allblacks", "blackcaps",
  "newzealand", "auckland", "kiwi", "summer", "winter", "sunshine", "princess", "master", "trustno1", "changeme",
  "workshop", "asphalt", "concrete", "roller", "excavator", "digger", "truck", "rck", "rckgroup", "kre",
]);

export const MIN_LENGTH = 8;

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; hint: string | null; ok: boolean };

export function isCommon(pw: string): boolean {
  const core = pw.toLowerCase().replace(/[\d\W_]+$/, "");
  return COMMON.has(pw.toLowerCase()) || (core.length >= 3 && COMMON.has(core));
}

export function passwordStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "", hint: null, ok: false };
  if (pw.length < MIN_LENGTH) {
    const left = MIN_LENGTH - pw.length;
    return { score: 0, label: "Too short", hint: `Add ${left} more character${left === 1 ? "" : "s"}`, ok: false };
  }
  if (isCommon(pw)) return { score: 0, label: "Too common", hint: "This password is too common", ok: false };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const repeats = /(.)\1{3,}/.test(pw) || /^(?:0123|1234|2345|abcd|qwer)/i.test(pw);
  let score = (pw.length >= 15 ? 2 : pw.length >= 11 ? 1 : 0) + (kinds >= 3 ? 2 : kinds === 2 ? 1 : 0);
  if (repeats) score -= 1;
  const s = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  const label = ({ 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong" } as const)[s];
  return { score: s, label, hint: s <= 1 ? "Try three words with dashes" : null, ok: true };
}

const WORDS = [
  "Roller", "Paver", "Miller", "Bobcat", "Tipper", "Grader", "Digger", "Loader", "Trailer", "Beacon", "Diesel", "Piston",
  "Gauge", "Drum", "Track", "Bucket", "Boom", "Gear", "Clutch", "Torque", "Asphalt", "Chip", "Kerb", "Culvert",
  "Gravel", "Bitumen", "Tarmac", "Hopper", "Screed", "Throttle", "Axle", "Spanner", "Rata", "Kowhai", "Totara", "Tui",
];

/** e.g. "Roller-Beacon-Diesel-47": three words, two digits; crypto-random. */
export function suggestPassword(rand: (n: number) => number = cryptoRandom): string {
  const pick = () => WORDS[rand(WORDS.length)];
  const words = new Set<string>();
  while (words.size < 3) words.add(pick());
  return `${[...words].join("-")}-${10 + rand(90)}`;
}

function cryptoRandom(n: number): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}
