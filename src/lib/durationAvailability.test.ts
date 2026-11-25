import { describe, expect, test } from "vitest";
import {
  checkDurationAvailability,
  parseDuration,
  isValidDuration,
  type DurationResult,
} from "@/lib/durationAvailability";
import type { Booking } from "@/lib/roomData";

const ORION_BOOKINGS: Booking[] = [
  { start: 660, end: 720 },
  { start: 780, end: 840 },
];
const CURRENT = 540;
const ROOM_NAME = "Orion Computer Lab O-202";

function check(
  start: number,
  duration: number,
  blocked = false,
  bookings: Booking[] = ORION_BOOKINGS
): DurationResult {
  return checkDurationAvailability({
    start,
    duration,
    blocked,
    currentMinutes: CURRENT,
    bookings,
    roomName: ROOM_NAME,
  });
}

describe("Duration availability — acceptance cases (Orion O-202, 09:00)", () => {
  test("T1: 14:15, 45 min, unblocked — available", () => {
    const r = check(855, 45, false);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBe("available");
    expect(r.end).toBe(900);
  });

  test("T2: 11:30, 60 min, unblocked — overlap", () => {
    const r = check(690, 60, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("overlap");
  });

  test("T3: 14:15, 45 min, blocked — room-blocked", () => {
    const r = check(855, 45, true);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("room-blocked");
  });

  test("T4: 14:15, 0 min, unblocked — invalid-range", () => {
    const r = check(855, 0, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("T5: 14:00, 121 min, unblocked — too-long", () => {
    const r = check(840, 121, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("too-long");
  });

  test("T6: 08:30, 30 min, unblocked — past-time", () => {
    const r = check(510, 30, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("past-time");
  });

  test("T7: 12:00, 60 min, unblocked — available (touching endpoints)", () => {
    const r = check(720, 60, false);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBe("available");
    expect(r.end).toBe(780);
  });

  test("T8: repeated checks do not modify original booking data", () => {
    const bookings: Booking[] = [
      { start: 660, end: 720 },
      { start: 780, end: 840 },
    ];
    const before = JSON.stringify(bookings);
    const snapshot = bookings.map((b) => ({ ...b }));

    check(855, 45, false, bookings);
    check(690, 60, false, bookings);
    check(720, 60, true, bookings);
    check(855, 45, false, bookings);

    expect(JSON.stringify(bookings)).toBe(before);
    expect(bookings).toEqual(snapshot);
    expect(bookings.length).toBe(2);
  });
});

describe("Duration availability — supplementary cases", () => {
  test("exactly 120 minutes is accepted", () => {
    const r = check(855, 120, false);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBe("available");
  });

  test("start equal to current time is rejected (past-time)", () => {
    const r = check(540, 30, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("past-time");
  });

  test("NaN start is rejected with invalid-range", () => {
    const r = check(Number.NaN, 45, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("NaN duration is rejected with invalid-range", () => {
    const r = check(855, Number.NaN, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("fractional duration is rejected with invalid-range", () => {
    const r = check(855, 45.5, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("non-finite duration (Infinity) is rejected with invalid-range", () => {
    const r = check(855, Number.POSITIVE_INFINITY, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("interval extending beyond midnight is rejected with invalid-range", () => {
    const r = check(1380, 120, false);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-range");
  });

  test("invalid current time (NaN) is rejected with invalid-current-time", () => {
    const r = checkDurationAvailability({
      start: 855,
      duration: 45,
      blocked: false,
      currentMinutes: Number.NaN,
      bookings: ORION_BOOKINGS,
      roomName: ROOM_NAME,
    });
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-current-time");
  });

  test("out-of-range current time (1440) is rejected with invalid-current-time", () => {
    const r = checkDurationAvailability({
      start: 855,
      duration: 45,
      blocked: false,
      currentMinutes: 1440,
      bookings: ORION_BOOKINGS,
      roomName: ROOM_NAME,
    });
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("invalid-current-time");
  });

  test("derived end time equals start + duration for a valid request", () => {
    const r = check(855, 45, false);
    expect(r.end).toBe(900);
  });

  test("blocked room with an otherwise-available slot returns room-blocked only", () => {
    const r = check(855, 45, true);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("room-blocked");
    expect(r.reasons).toHaveLength(1);
  });
});

describe("parseDuration", () => {
  test("parses a valid integer string", () => {
    expect(parseDuration("45")).toBe(45);
  });

  test("returns NaN for empty or whitespace input", () => {
    expect(parseDuration("")).toBeNaN();
    expect(parseDuration("   ")).toBeNaN();
  });

  test("returns NaN for non-numeric input", () => {
    expect(parseDuration("abc")).toBeNaN();
  });
});

describe("isValidDuration", () => {
  test("accepts whole numbers from 1 to 120", () => {
    expect(isValidDuration(1)).toBe(true);
    expect(isValidDuration(120)).toBe(true);
  });

  test("rejects zero, negative, and values above 120", () => {
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(-5)).toBe(false);
    expect(isValidDuration(121)).toBe(false);
  });

  test("rejects fractional and non-finite values", () => {
    expect(isValidDuration(45.5)).toBe(false);
    expect(isValidDuration(Number.NaN)).toBe(false);
    expect(isValidDuration(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
