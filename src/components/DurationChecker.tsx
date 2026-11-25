import { useState } from "react";
import { MapPin, Users, Lock, LockOpen, Search, Tag, Clock } from "lucide-react";
import type { Booking } from "@/lib/roomData";
import { labelToMinutes, minutesToLabel } from "@/lib/availability";
import {
  checkDurationAvailability,
  parseDuration,
  type DurationResult,
} from "@/lib/durationAvailability";
import Timeline from "@/components/Timeline";

interface DurationCheckerProps {
  roomName: string;
  location: string;
  capacity: number;
  bookings: Booking[];
}

export default function DurationChecker({
  roomName,
  location,
  capacity,
  bookings,
}: DurationCheckerProps) {
  const [startLabel, setStartLabel] = useState("14:15");
  const [durationInput, setDurationInput] = useState("45");
  const [blocked, setBlocked] = useState(false);
  const [currentTimeLabel, setCurrentTimeLabel] = useState("09:00");
  const [result, setResult] = useState<DurationResult | null>(null);

  const startMin = labelToMinutes(startLabel);
  const duration = parseDuration(durationInput);
  const currentMin = labelToMinutes(currentTimeLabel);
  const hasValidNumbers =
    Number.isFinite(startMin) && Number.isFinite(duration) && Number.isFinite(currentMin);
  const derivedEnd = hasValidNumbers ? startMin + duration : null;
  const candidate =
    hasValidNumbers &&
    derivedEnd !== null &&
    startMin < derivedEnd &&
    derivedEnd <= 1440
      ? { start: startMin, end: derivedEnd }
      : null;

  const durationHint =
    durationInput.trim() === ""
      ? "Enter a duration in minutes (1–120)."
      : !Number.isFinite(duration)
        ? "Duration must be a number."
        : !Number.isInteger(duration)
          ? "Duration must be a whole number."
          : duration < 1
            ? "Duration must be at least 1 minute."
            : duration > 120
              ? "Duration cannot exceed 120 minutes."
              : null;

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(
      checkDurationAvailability({
        start: startMin,
        duration,
        blocked,
        blockReason: "Test block (toggle)",
        currentMinutes: currentMin,
        bookings,
        roomName,
      })
    );
  };

  const reasonBadgeClass = (code: string): string => {
    if (code === "available") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (code === "room-blocked" || code === "overlap")
      return "bg-rose-100 text-rose-700 border-rose-200";
    if (code === "unknown") return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{roomName}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {capacity} seats
              </span>
              <span className="flex items-center gap-1">
                {blocked ? (
                  <Lock className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <LockOpen className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {blocked ? "Blocked (test)" : "Open"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Timeline
            bookings={bookings}
            blocked={blocked}
            currentMinutes={Number.isFinite(currentMin) ? currentMin : 540}
            candidate={candidate}
          />
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Existing Bookings (read-only)
          </p>
          {bookings.length === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">No existing bookings.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {bookings.map((b, i) => (
                <li key={i} className="text-xs text-slate-600">
                  {minutesToLabel(b.start)}–{minutesToLabel(b.end)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-bold text-slate-800">Check a Time Range (Duration Mode)</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Enter a start time and duration in minutes. The end time is calculated automatically.
        </p>

        <form onSubmit={handleCheck} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Start time</span>
              <input
                type="time"
                value={startLabel}
                onChange={(e) => {
                  setStartLabel(e.target.value);
                  setResult(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Duration (minutes)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={durationInput}
                onChange={(e) => {
                  setDurationInput(e.target.value);
                  setResult(null);
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                  durationHint
                    ? "border-amber-400 focus:border-amber-500 focus:ring-amber-200"
                    : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                }`}
              />
              {durationHint && (
                <span className="mt-1 block text-xs text-amber-600">{durationHint}</span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Current time (for testing)
              </span>
              <input
                type="time"
                value={currentTimeLabel}
                onChange={(e) => {
                  setCurrentTimeLabel(e.target.value);
                  setResult(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={blocked}
              onClick={() => {
                setBlocked(!blocked);
                setResult(null);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                blocked ? "bg-rose-500" : "bg-emerald-400"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  blocked ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs font-medium text-slate-600">
              {blocked ? "Room blocked (test)" : "Room open (test)"}
            </span>
          </label>

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Calculated end:{" "}
              <span className="font-semibold text-slate-800">
                {derivedEnd !== null && Number.isFinite(derivedEnd)
                  ? minutesToLabel(derivedEnd)
                  : "—"}
              </span>
              {hasValidNumbers && derivedEnd !== null && Number.isFinite(derivedEnd) && (
                <span className="ml-2 text-slate-400">({duration} min)</span>
              )}
            </span>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:w-auto"
          >
            <Search className="h-4 w-4" />
            Check Availability
          </button>
        </form>

        {result ? (
          <div className="mt-5">
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                result.available
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  result.available ? "bg-emerald-100" : "bg-rose-100"
                }`}
              >
                {result.available ? (
                  <LockOpen className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Lock className="h-4 w-4 text-rose-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      result.available ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {result.available ? "Available" : "Unavailable"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${reasonBadgeClass(
                      result.reasonCode
                    )}`}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {result.reasonCode}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${
                    result.available ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {result.message}
                </p>
                {!result.available && result.reasons.length > 1 && (
                  <ul className="mt-2 space-y-0.5 pl-1">
                    {result.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-rose-600">
                        — {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Availability does not mean a booking was created. No data is saved.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="text-sm text-slate-500">
              Enter a start time and duration, then check availability.
            </span>
          </div>
        )}
      </section>
    </>
  );
}
