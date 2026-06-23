import { useEffect, useMemo, useState, type ReactNode } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useListGyms } from "@workspace/api-client-react";
import {
  CalendarDays,
  Clock,
  Dumbbell,
  Loader2,
  PartyPopper,
  Sparkles,
} from "lucide-react";

type Props = {
  trigger: ReactNode;
  kind: "class" | "gym" | "general" | "membership";
  classId?: number;
  gymId?: number;
  planId?: number;
  className?: string;
  gymName?: string;
  planName?: string;
  planPriceInr?: number;
  source?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  badgeLabel?: string;
  successTitle?: string;
  successDescription?: string;
};

function fireCelebration(): () => void {
  const end = Date.now() + 1200;
  const colors = ["#84cc16", "#22c55e", "#16a34a", "#bef264", "#ffffff"];
  let rafId = 0;
  // Initial big burst
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
  });
  // Side cannons that keep firing for a moment
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}

function formatNiceDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNiceTime(t: string): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── GX class schedule rules ────────────────────────────────────────────────
// GX classes run Monday–Friday in two fixed one-hour slots, and members may
// prebook only 1 day in advance (today + tomorrow), never on weekends.
const GX_SLOTS = [
  { value: "07:00", label: "7:00 AM – 8:00 AM" },
  { value: "19:00", label: "7:00 PM – 8:00 PM" },
] as const;

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type GxDateOption = {
  iso: string;
  label: string;
  slots: { value: string; label: string }[];
};

// Build the selectable date+slot options inside the 1-day prebook window.
function gxDateOptions(now: Date = new Date()): GxDateOption[] {
  const out: GxDateOption[] = [];
  for (let i = 0; i <= 1; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // Mon–Fri only
    const slots = GX_SLOTS.filter((s) => {
      if (i > 0) return true; // any future day: both slots open
      const [h, m] = s.value.split(":").map(Number);
      const slotStart = new Date(d);
      slotStart.setHours(h, m, 0, 0);
      return slotStart.getTime() > now.getTime(); // today: only upcoming slots
    });
    if (slots.length === 0) continue;
    const label = d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    out.push({
      iso: toISODate(d),
      label: i === 0 ? `Today · ${label}` : `Tomorrow · ${label}`,
      slots: slots.map((s) => ({ value: s.value, label: s.label })),
    });
  }
  return out;
}

export function LeadEnquiryDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [gymName, setGymName] = useState(props.gymName ?? "");
  const [gymId, setGymId] = useState<number | undefined>(props.gymId);
  const [workout, setWorkout] = useState(props.className ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isClass = props.kind === "class";
  const successBadgeLabel = isClass ? "Members Only" : "2-Day Free Trial";
  const successDescriptionText =
    props.successDescription ??
    (isClass
      ? "Your spot is reserved! GX classes are exclusive to active members. Bring your membership to the gym and our team will help you get started — see you on the mat!"
      : "You've been selected for a 2-Day FREE Trial. Visit the gym and start your fitness journey with us!");

  const { data: gyms } = useListGyms();

  useEffect(() => {
    if (!done) return;
    const cancel = fireCelebration();
    return cancel;
  }, [done]);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setGymName(props.gymName ?? "");
    setGymId(props.gymId);
    setWorkout(props.className ?? "");
    setPreferredDate("");
    setPreferredTime("");
    setMessage("");
    setErr(null);
    setDone(false);
  };

  const onSelectGym = (value: string) => {
    setGymName(value);
    const match = (gyms ?? []).find((g) => g.name === value);
    setGymId(match?.id ?? props.gymId);
  };

  // GX class bookings are restricted to Mon–Fri fixed slots, prebookable only
  // 1 day ahead. Other enquiry kinds (gym trial, membership) keep free pickers.
  const isClassBooking = props.kind === "class";
  const classDateOptions = useMemo(
    () => (isClassBooking && open ? gxDateOptions() : []),
    [isClassBooking, open],
  );
  const slotsForSelectedDate =
    classDateOptions.find((o) => o.iso === preferredDate)?.slots ?? [];

  const onSelectClassDate = (iso: string) => {
    setPreferredDate(iso);
    const slots = classDateOptions.find((o) => o.iso === iso)?.slots ?? [];
    // Drop the chosen time if it is no longer valid for the new date.
    if (!slots.some((s) => s.value === preferredTime)) setPreferredTime("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: props.kind,
          classId: props.classId,
          gymId,
          planId: props.planId,
          className: workout,
          gymName,
          planName: props.planName,
          planPriceInr: props.planPriceInr,
          source: props.source ?? "web",
          name,
          phone,
          email,
          city,
          preferredDate,
          preferredTime,
          message,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not submit enquiry");
      }
      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="py-6 text-center space-y-5">
            <div className="relative mx-auto h-20 w-20">
              <span className="absolute inset-0 rounded-full bg-lime-400/30 animate-ping" />
              <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center shadow-lg shadow-lime-500/40">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-black">
                {props.successTitle ?? "Congratulations!"}
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                {successDescriptionText}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-lime-200 bg-lime-50 dark:bg-lime-950/30 dark:border-lime-900/50 p-4 text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" />
                {successBadgeLabel}
              </div>
              {gymName ? (
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Dumbbell className="h-4 w-4 text-lime-600" />
                  {gymName}
                </div>
              ) : null}
              {preferredDate ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 text-lime-600" />
                  {formatNiceDate(preferredDate)}
                </div>
              ) : null}
              {preferredTime ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-lime-600" />
                  {formatNiceTime(preferredTime)}
                </div>
              ) : null}
            </div>

            <Button
              className="w-full font-bold"
              onClick={() => setOpen(false)}
            >
              Awesome, see you there!
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                {props.badgeLabel ?? "Book a Class"}
              </div>
              <DialogTitle className="text-2xl font-black">
                {props.title ?? "Book your class"}
              </DialogTitle>
              <DialogDescription>
                {props.description ??
                  "Share a few details and our team will call to confirm your booking."}
                {props.planName ? (
                  <span className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-lime-200 bg-lime-50 dark:bg-lime-950/30 dark:border-lime-900/50 px-3 py-2">
                    <span className="text-foreground font-bold text-sm">
                      {props.planName}
                    </span>
                    {typeof props.planPriceInr === "number" &&
                      props.planPriceInr > 0 && (
                        <span className="text-lime-600 dark:text-lime-300 font-black text-sm">
                          ₹{props.planPriceInr.toLocaleString("en-IN")}
                        </span>
                      )}
                  </span>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Full name *</Label>
                <Input
                  id="lead-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-phone">Phone *</Label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 90000 00000"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-city">City</Label>
                  <Input
                    id="lead-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {/* Gym / Class section */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  <Dumbbell className="h-3.5 w-3.5 text-lime-600" />
                  Gym & Class
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-gym">Choose gym *</Label>
                  <select
                    id="lead-gym"
                    value={gymName}
                    onChange={(e) => onSelectGym(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Select a gym
                    </option>
                    {gymName &&
                    !(gyms ?? []).some((g) => g.name === gymName) ? (
                      <option value={gymName}>{gymName}</option>
                    ) : null}
                    {(gyms ?? []).map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                        {g.area ? ` — ${g.area}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-workout">Class / workout</Label>
                  <Input
                    id="lead-workout"
                    value={workout}
                    onChange={(e) => setWorkout(e.target.value)}
                    placeholder="e.g. Strength, Yoga, Zumba, CrossFit"
                  />
                </div>
              </div>

              {/* Date & Time section */}
              <div className="rounded-2xl border border-lime-200 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/30 dark:to-green-950/20 dark:border-lime-900/50 p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-lime-700 dark:text-lime-300">
                  <CalendarDays className="h-3.5 w-3.5" />
                  When are you coming?
                </div>
                {isClassBooking ? (
                  classDateOptions.length === 0 ? (
                    <p className="text-xs font-semibold text-lime-700 dark:text-lime-300">
                      GX classes run Mon–Fri at 7:00–8:00 AM and 7:00–8:00 PM,
                      and can be prebooked only 1 day ahead. No slots are open
                      right now — please check back later.
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] text-lime-700 dark:text-lime-300">
                        GX classes run Mon–Fri · prebook only 1 day ahead.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="lead-date"
                            className="flex items-center gap-1"
                          >
                            <CalendarDays className="h-3 w-3 text-lime-600" />{" "}
                            Day *
                          </Label>
                          <select
                            id="lead-date"
                            value={preferredDate}
                            onChange={(e) => onSelectClassDate(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="" disabled>
                              Select a day
                            </option>
                            {classDateOptions.map((o) => (
                              <option key={o.iso} value={o.iso}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="lead-time"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3 text-lime-600" /> Slot *
                          </Label>
                          <select
                            id="lead-time"
                            value={preferredTime}
                            onChange={(e) => setPreferredTime(e.target.value)}
                            required
                            disabled={!preferredDate}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="" disabled>
                              {preferredDate ? "Select a slot" : "Pick a day first"}
                            </option>
                            {slotsForSelectedDate.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-date"
                        className="flex items-center gap-1"
                      >
                        <CalendarDays className="h-3 w-3 text-lime-600" /> Date *
                      </Label>
                      <Input
                        id="lead-date"
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-time"
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3 text-lime-600" /> Time *
                      </Label>
                      <Input
                        id="lead-time"
                        type="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                {preferredDate || preferredTime ? (
                  <p className="text-xs font-semibold text-lime-700 dark:text-lime-300">
                    Visiting{" "}
                    {preferredDate ? formatNiceDate(preferredDate) : "—"}
                    {preferredTime ? ` at ${formatNiceTime(preferredTime)}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-msg">Anything we should know?</Label>
                <Textarea
                  id="lead-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Goals, fitness level, questions..."
                  rows={2}
                />
              </div>
            </div>

            {err ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {err}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-12 text-base font-black tracking-wide"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  props.ctaLabel ?? "Submit"
                )}
              </Button>
            </DialogFooter>
            <p className="text-[11px] text-muted-foreground text-center">
              Our team will call to confirm your free trial visit.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
