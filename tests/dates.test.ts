import { describe, it, expect } from "vitest";
import { isoDate, addDays, comparePeriods, lastNDays } from "@/lib/dates";

describe("dates", () => {
  it("isoDate formats to YYYY-MM-DD", () => {
    expect(isoDate(new Date("2026-05-28T12:00:00Z"))).toBe("2026-05-28");
  });

  it("addDays shifts and formats", () => {
    expect(addDays("2026-05-28", -3)).toBe("2026-05-25");
  });

  it("comparePeriods returns 28d current and previous windows ending at lagged today", () => {
    // today 2026-05-28, lag 3 => latest data day = 2026-05-25
    const r = comparePeriods("2026-05-28", 3, 28);
    expect(r.current.end).toBe("2026-05-25");
    expect(r.current.start).toBe("2026-04-28"); // 28 days inclusive
    expect(r.previous.end).toBe("2026-04-27");
    expect(r.previous.start).toBe("2026-03-31");
  });

  it("lastNDays returns inclusive window ending at lagged today", () => {
    const r = lastNDays("2026-05-28", 3, 30);
    expect(r.end).toBe("2026-05-25");
    expect(r.start).toBe("2026-04-26"); // 30 days inclusive
  });
});
