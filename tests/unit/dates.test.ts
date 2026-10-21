import { describe, expect, it } from "vitest";
import {
  addDays,
  cairoDateString,
  cairoDayBoundsUtc,
  cairoOffsetMinutes,
  cairoParts,
  diffDays,
  isValidDateString,
  relativeDay,
} from "@/lib/utils/dates";
import { formatCairoTime } from "@/lib/utils/format";

describe("Cairo dates", () => {
  it("uses the Cairo calendar day, not UTC", () => {
    // 2026-10-21 21:30 UTC = 2026-10-22 00:30 in Cairo (UTC+3, DST)
    expect(cairoDateString(Date.UTC(2026, 9, 21, 21, 30))).toBe("2026-10-22");
    // 2026-10-21 20:59 UTC = 23:59 Cairo → still the 21st
    expect(cairoDateString(Date.UTC(2026, 9, 21, 20, 59))).toBe("2026-10-21");
  });

  it("handles Egypt's DST offsets (UTC+3 summer, UTC+2 winter)", () => {
    expect(cairoOffsetMinutes(Date.UTC(2026, 6, 1, 12))).toBe(180);
    expect(cairoOffsetMinutes(Date.UTC(2026, 0, 15, 12))).toBe(120);
    // Winter: 22:30 UTC = 00:30 next day in Cairo
    expect(cairoDateString(Date.UTC(2026, 0, 15, 22, 30))).toBe("2026-01-16");
  });

  it("is independent from the process/device time zone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati"; // UTC+14
      const a = cairoDateString(Date.UTC(2026, 9, 21, 12));
      process.env.TZ = "America/Los_Angeles"; // UTC-7
      const b = cairoDateString(Date.UTC(2026, 9, 21, 12));
      expect(a).toBe("2026-10-21");
      expect(b).toBe("2026-10-21");
      expect(formatCairoTime(Date.UTC(2026, 9, 21, 17, 0))).toContain("8:00");
    } finally {
      process.env.TZ = original;
    }
  });

  it("computes Cairo day bounds in UTC", () => {
    const { start, end } = cairoDayBoundsUtc("2026-10-21");
    expect(start.toISOString()).toBe("2026-10-20T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-21T21:00:00.000Z");
    expect(cairoParts(start).hour).toBe(0);
  });

  it("validates and shifts date strings", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("../etc/passwd")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-10-21", "2026-10-24")).toBe(3);
    expect(relativeDay("2026-10-20", "2026-10-21")).toBe("yesterday");
    expect(relativeDay("2026-10-22", "2026-10-21")).toBe("tomorrow");
    expect(relativeDay("2026-10-25", "2026-10-21")).toBeNull();
  });
});
