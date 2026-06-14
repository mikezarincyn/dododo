// Best-effort age from a free-text birth month. Accepts "YYYY-MM", "Month YYYY"
// ("March 2023"), or "Mon YYYY". Returns {y, m} or null if it can't parse — the
// card then falls back to showing the raw birth-month string.
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function ageFromBirthMonth(s: string, now: Date = new Date()): { y: number; m: number } | null {
  if (!s) return null;
  const str = s.trim().toLowerCase();
  let year: number | null = null;
  let month: number | null = null; // 0-based

  const iso = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
  } else {
    const ym = str.match(/([a-z]+)\.?\s+(\d{4})/) || str.match(/(\d{4})\s+([a-z]+)/);
    if (ym) {
      const a = ym[1];
      const b = ym[2];
      const monthWord = /\d/.test(a) ? b : a;
      const yearStr = /\d/.test(a) ? a : b;
      const idx = MONTHS.findIndex((mo) => mo.startsWith(monthWord.slice(0, 3)));
      if (idx >= 0) {
        month = idx;
        year = Number(yearStr);
      }
    }
  }

  if (year == null || month == null || Number.isNaN(year) || month < 0 || month > 11) return null;
  let total = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
  if (total < 0) total = 0;
  return { y: Math.floor(total / 12), m: total % 12 };
}
