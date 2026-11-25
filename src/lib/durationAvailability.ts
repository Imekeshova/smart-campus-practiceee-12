import { checkAvailability, type CheckOutcome } from "@/lib/availability";
import { reasonToCode, type ReasonCode } from "@/lib/explain";
import type { Booking, Room } from "@/lib/roomData";

export interface DurationRequest {
  start: number;
  duration: number;
  blocked: boolean;
  blockReason?: string;
  currentMinutes: number;
  bookings: Booking[];
  roomName: string;
}

export interface DurationResult {
  available: boolean;
  reasonCode: ReasonCode;
  message: string;
  reasons: string[];
  end: number;
}

const MINUTES_IN_DAY = 1440;

export function parseDuration(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return Number.NaN;
  return Number(trimmed);
}

export function isValidDuration(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= 120;
}

function invalidResult(reasonCode: ReasonCode, message: string): DurationResult {
  return {
    available: false,
    reasonCode,
    message,
    reasons: [message],
    end: NaN,
  };
}

export function checkDurationAvailability(req: DurationRequest): DurationResult {
  const { start, duration, blocked, blockReason, currentMinutes, bookings, roomName } = req;

  if (!Number.isFinite(start) || !Number.isInteger(start) || start < 0 || start > MINUTES_IN_DAY) {
    return invalidResult("invalid-range", "Start time must be a whole number of minutes between 0 and 1440.");
  }

  if (!Number.isFinite(duration) || !Number.isInteger(duration)) {
    return invalidResult("invalid-range", "Duration must be a whole number of minutes.");
  }

  if (
    !Number.isFinite(currentMinutes) ||
    !Number.isInteger(currentMinutes) ||
    currentMinutes < 0 ||
    currentMinutes >= MINUTES_IN_DAY
  ) {
    return invalidResult("invalid-current-time", "Current time is missing or invalid.");
  }

  const end = start + duration;

  const room: Room = {
    id: "duration-fixture",
    name: roomName,
    location: "",
    capacity: 0,
    equipment: [],
    blocked,
    blockReason,
    bookings: bookings.map((b) => ({ ...b })),
  };

  const outcome: CheckOutcome = checkAvailability({ start, end, currentMinutes, room });

  if (outcome.status === "available") {
    return {
      available: true,
      reasonCode: "available",
      message: "This time range is open and can be booked.",
      reasons: [],
      end,
    };
  }

  const firstReason = outcome.reasons[0] ?? "This time range cannot be booked.";
  return {
    available: false,
    reasonCode: reasonToCode(firstReason),
    message: firstReason,
    reasons: outcome.reasons,
    end,
  };
}
