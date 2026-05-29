export interface DateWindow { start: string; end: string; }

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

// Latest day with data, given today and the source lag.
export function laggedToday(todayIso: string, lagDays: number): string {
  return addDays(todayIso, -lagDays);
}

// Inclusive N-day window ending at the lagged today.
export function lastNDays(todayIso: string, lagDays: number, n: number): DateWindow {
  const end = laggedToday(todayIso, lagDays);
  const start = addDays(end, -(n - 1));
  return { start, end };
}

// Current N-day window vs the immediately preceding N-day window.
export function comparePeriods(todayIso: string, lagDays: number, n: number) {
  const current = lastNDays(todayIso, lagDays, n);
  const prevEnd = addDays(current.start, -1);
  const prevStart = addDays(prevEnd, -(n - 1));
  return { current, previous: { start: prevStart, end: prevEnd } as DateWindow };
}
