import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useListGyms } from "@workspace/api-client-react";
import {
  CalendarDays,
  Clock,
  Dumbbell,
  Loader2,
  MapPin,
  PartyPopper,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

type ScheduleSlot = {
  dayOfWeek: number; // 1 = Mon … 7 = Sun
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  className: string;
  sortOrder: number;
};

const DAY_FULL: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

function fmtClockTime(t: string): string {
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

// GX windows are computed in India time so the day+slot options the user sees
// match exactly what the server (which validates in Asia/Kolkata) will accept,
// regardless of the visitor's local timezone.
const GX_TIMEZONE = "Asia/Kolkata";

// Calendar date (YYYY-MM-DD) for an instant, rendered in India time.
function istDateISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GX_TIMEZONE }).format(d);
}

// Current wall-clock "HH:MM" in India time (24h, zero-padded).
function istHHMM(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GX_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// 1 = Mon … 7 = Sun for a YYYY-MM-DD calendar date.
function isoDow(iso: string): number {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

function niceDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

type DayOption = {
  iso: string;
  label: string;
  dateLabel: string;
  slots: ScheduleSlot[];
};

// Build selectable day+slot options inside the 1-day prebook window (today +
// tomorrow, in India time), driven by the chosen branch's weekly timetable.
// Today's slots that have already started are dropped.
function buildDayOptions(
  schedule: ScheduleSlot[],
  now: Date = new Date(),
): DayOption[] {
  const todayISO = istDateISO(now);
  const tomorrowISO = istDateISO(new Date(now.getTime() + 24 * 3600 * 1000));
  const nowHHMM = istHHMM(now);
  const days = [
    { iso: todayISO, label: "Today", isToday: true },
    { iso: tomorrowISO, label: "Tomorrow", isToday: false },
  ];
  const out: DayOption[] = [];
  for (const day of days) {
    const dow = isoDow(day.iso);
    const slots = schedule
      .filter((s) => s.dayOfWeek === dow)
      .filter((s) => (day.isToday ? s.startTime > nowHHMM : true))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (slots.length === 0) continue;
    out.push({
      iso: day.iso,
      label: day.label,
      dateLabel: niceDateLabel(day.iso),
      slots,
    });
  }
  return out;
}

function fireCelebration(): () => void {
  const end = Date.now() + 1200;
  const colors = ["#84cc16", "#22c55e", "#16a34a", "#bef264", "#ffffff"];
  let rafId = 0;
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
  });
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}

export default function BookGxClass() {
  const { data: gyms } = useListGyms();

  const [gymId, setGymId] = useState<number | undefined>(undefined);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [selectedIso, setSelectedIso] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedGym = useMemo(
    () => (gyms ?? []).find((g) => g.id === gymId),
    [gyms, gymId],
  );

  // Fetch the branch's timetable whenever the branch changes.
  useEffect(() => {
    if (!gymId) {
      setSchedule([]);
      return;
    }
    let cancelled = false;
    setLoadingSchedule(true);
    setSchedule([]);
    setSelectedIso("");
    setSelectedTime("");
    fetch(`/api/gyms/${gymId}/schedule`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ScheduleSlot[]) => {
        if (!cancelled) setSchedule(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSchedule([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSchedule(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  useEffect(() => {
    if (!done) return;
    const cancel = fireCelebration();
    return cancel;
  }, [done]);

  const dayOptions = useMemo(
    () => (schedule.length > 0 ? buildDayOptions(schedule) : []),
    [schedule],
  );
  const selectedDay = dayOptions.find((o) => o.iso === selectedIso);
  const selectedSlot = selectedDay?.slots.find(
    (s) => s.startTime === selectedTime,
  );

  const onSelectGym = (value: string) => {
    const id = Number(value);
    setGymId(Number.isFinite(id) && id > 0 ? id : undefined);
  };

  const onSelectDay = (iso: string) => {
    setSelectedIso(iso);
    const slots = dayOptions.find((o) => o.iso === iso)?.slots ?? [];
    if (!slots.some((s) => s.startTime === selectedTime)) setSelectedTime("");
  };

  const canSubmit =
    !!gymId &&
    !!selectedIso &&
    !!selectedTime &&
    name.trim().length >= 2 &&
    phone.trim().length >= 7;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "class",
          gymId,
          gymName: selectedGym?.name ?? "",
          className: selectedSlot?.className ?? "",
          source: "book-gx-page",
          name,
          phone,
          email,
          city,
          preferredDate: selectedIso,
          preferredTime: selectedTime,
          message,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not book your class");
      }
      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8 text-center space-y-5">
          <div className="relative mx-auto h-20 w-20">
            <span className="absolute inset-0 rounded-full bg-lime-400/30 animate-ping" />
            <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center shadow-lg shadow-lime-500/40">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black">You're booked! 🎉</h1>
            <p className="text-muted-foreground">
              Your GX class slot is reserved. Our team will call to confirm.
            </p>
          </div>
          <div className="rounded-2xl border border-lime-200 bg-lime-50 dark:bg-lime-950/30 dark:border-lime-900/50 p-4 text-left space-y-2">
            {selectedSlot?.className ? (
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Dumbbell className="h-4 w-4 text-lime-600" />
                {selectedSlot.className}
              </div>
            ) : null}
            {selectedGym?.name ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-lime-600" />
                {selectedGym.name}
              </div>
            ) : null}
            {selectedDay ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CalendarDays className="h-4 w-4 text-lime-600" />
                {selectedDay.label} · {selectedDay.dateLabel}
              </div>
            ) : null}
            {selectedSlot ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="h-4 w-4 text-lime-600" />
                {fmtClockTime(selectedSlot.startTime)} –{" "}
                {fmtClockTime(selectedSlot.endTime)}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setDone(false);
                setSelectedIso("");
                setSelectedTime("");
              }}
            >
              Book another class
            </Button>
            <Link href="/">
              <Button className="font-bold w-full sm:w-auto">Back to home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 text-[10px] font-black uppercase tracking-wider mb-3">
          <Sparkles className="h-3 w-3" />
          Group Class Booking
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Book a GX Class
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose your branch, pick an available slot from its weekly timetable,
          and reserve your spot. Classes can be prebooked up to 1 day ahead.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Step 1 — Branch */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-lime-600" />
            1 · Choose branch
          </div>
          <select
            value={gymId ?? ""}
            onChange={(e) => onSelectGym(e.target.value)}
            required
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              Select a branch
            </option>
            {(gyms ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.area ? ` — ${g.area}` : ""}
              </option>
            ))}
          </select>
        </Card>

        {/* Step 2 — Slot */}
        {gymId ? (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-lime-600" />
              2 · Pick an available slot
            </div>

            {loadingSchedule ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading timetable…
              </div>
            ) : dayOptions.length === 0 ? (
              <p className="text-sm font-semibold text-muted-foreground py-2">
                No slots are open for this branch in the next day. GX classes can
                be prebooked only 1 day ahead — please check back later.
              </p>
            ) : (
              <div className="space-y-5">
                {dayOptions.map((day) => (
                  <div key={day.iso} className="space-y-2">
                    <div className="text-sm font-bold text-foreground">
                      {day.label}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {day.dateLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {day.slots.map((s) => {
                        const active =
                          selectedIso === day.iso &&
                          selectedTime === s.startTime;
                        return (
                          <button
                            key={`${day.iso}-${s.startTime}-${s.sortOrder}`}
                            type="button"
                            onClick={() => {
                              onSelectDay(day.iso);
                              setSelectedTime(s.startTime);
                            }}
                            className={[
                              "text-left rounded-xl border p-3 transition-all",
                              active
                                ? "border-lime-500 bg-lime-50 dark:bg-lime-950/40 ring-2 ring-lime-500/40"
                                : "border-border hover:border-lime-400 hover:bg-secondary/40",
                            ].join(" ")}
                          >
                            <div className="font-bold text-sm text-foreground">
                              {s.className}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 text-lime-600" />
                              {fmtClockTime(s.startTime)} –{" "}
                              {fmtClockTime(s.endTime)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Full weekly timetable for{" "}
                  {selectedGym?.name ?? "this branch"}:{" "}
                  {gymId ? (
                    <Link
                      href={`/gyms/${gymId}`}
                      className="font-semibold text-lime-600 hover:underline"
                    >
                      view branch page
                    </Link>
                  ) : null}
                </p>
              </div>
            )}
          </Card>
        ) : null}

        {/* Step 3 — Details */}
        {gymId && selectedSlot ? (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5 text-lime-600" />
              3 · Your details
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gx-name">Full name *</Label>
              <Input
                id="gx-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gx-phone">Phone *</Label>
                <Input
                  id="gx-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gx-city">City</Label>
                <Input
                  id="gx-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gx-email">Email</Label>
              <Input
                id="gx-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gx-msg">Anything we should know?</Label>
              <Textarea
                id="gx-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Goals, fitness level, questions…"
                rows={2}
              />
            </div>
          </Card>
        ) : null}

        {err ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!canSubmit || busy}
          className="w-full h-12 text-base font-black tracking-wide"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Booking…
            </>
          ) : selectedSlot ? (
            `Book ${selectedSlot.className}`
          ) : (
            "Pick a slot to book"
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Our team will call to confirm your class booking.
        </p>
      </form>
    </div>
  );
}
