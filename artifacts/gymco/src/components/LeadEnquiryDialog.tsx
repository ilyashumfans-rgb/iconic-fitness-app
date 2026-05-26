import { useState, type ReactNode } from "react";
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
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

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

export function LeadEnquiryDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setPreferredDate("");
    setMessage("");
    setErr(null);
    setDone(false);
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
          gymId: props.gymId,
          planId: props.planId,
          className: props.className,
          gymName: props.gymName,
          planName: props.planName,
          planPriceInr: props.planPriceInr,
          source: props.source ?? "web",
          name,
          phone,
          email,
          city,
          preferredDate,
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
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-black">
                {props.successTitle ?? "Enquiry Received!"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {props.successDescription ??
                  "Our team will call you shortly to confirm your free class."}
              </DialogDescription>
            </DialogHeader>
            <Button
              className="w-full font-bold"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                {props.badgeLabel ?? "Free Trial"}
              </div>
              <DialogTitle className="text-2xl font-black">
                {props.title ?? "Book your free class"}
              </DialogTitle>
              <DialogDescription>
                {props.description ??
                  "Share a few details and our team will call to confirm your free trial."}
                {props.planName ? (
                  <span className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900/50 px-3 py-2">
                    <span className="text-foreground font-bold text-sm">
                      {props.planName}
                    </span>
                    {typeof props.planPriceInr === "number" &&
                      props.planPriceInr > 0 && (
                        <span className="text-orange-600 dark:text-orange-300 font-black text-sm">
                          ₹{props.planPriceInr.toLocaleString("en-IN")}
                        </span>
                      )}
                  </span>
                ) : props.className ? (
                  <span className="block mt-1 text-foreground font-semibold">
                    {props.className}
                    {props.gymName ? ` at ${props.gymName}` : ""}
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
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label htmlFor="lead-date">Preferred date</Label>
                  <Input
                    id="lead-date"
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-msg">Anything we should know?</Label>
                <Textarea
                  id="lead-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Goals, fitness level, questions..."
                  rows={3}
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
                    Sending...
                  </>
                ) : (
                  props.ctaLabel ?? "Send Enquiry"
                )}
              </Button>
            </DialogFooter>
            <p className="text-[11px] text-muted-foreground text-center">
              No charges. Our team will call to schedule your free session.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
