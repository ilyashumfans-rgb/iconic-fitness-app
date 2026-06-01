import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  CalendarCheck,
} from "lucide-react";

const BOOKING_URL =
  "https://www.yoactiv.com/busprofilenew.aspx?adminid=rluTL4jfpHwHqOp8CCgxtA==";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I become a member at Iconic Fitness?",
    a: "Pick a plan and book directly through the booking panel on this page. Our team will confirm your slot and walk you through everything on your first visit.",
  },
  {
    q: "Can I try the gym before committing to a membership?",
    a: "Yes. Reach out via the booking panel or call us and we'll set up a trial session so you can experience the floor, classes, and trainers first-hand.",
  },
  {
    q: "What workout formats are available?",
    a: "Strength training, functional fitness, cardio, group classes, and personal training — all guided by certified coaches in a fully-equipped facility.",
  },
  {
    q: "Do you offer personal training?",
    a: "Absolutely. We have dedicated personal trainers who build programs around your goals, whether that's fat loss, strength, mobility, or general fitness.",
  },
  {
    q: "What are your timings?",
    a: "We're open early mornings through late evenings to fit around your schedule. Contact us for the latest timings at your preferred location.",
  },
  {
    q: "How do I get in touch?",
    a: "Call us on 070262 76888 or 070263 22322, or email iconicfitnessindia@gmail.com. You can also drop by our Koramangala location.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="w-full text-left rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-foreground">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-primary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>
      {open && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </button>
  );
}

export default function BeAMember() {
  return (
    <div className="space-y-14 animate-in fade-in duration-500">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-black tracking-[0.2em] text-primary uppercase mb-4">
          <Sparkles className="h-3 w-3" /> Join Iconic Fitness
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Be a <span className="text-gradient-brand">Member.</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Book your membership or a trial session in seconds. Pick a time that
          works for you and our team will take care of the rest.
        </p>
      </section>

      {/* Booking iframe */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Book your membership</h2>
        </div>
        <Card className="overflow-hidden rounded-3xl border-border p-0 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
          <iframe
            src={BOOKING_URL}
            title="Iconic Fitness booking"
            className="w-full"
            style={{ height: "1100px", border: "0" }}
            loading="lazy"
          />
        </Card>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Trouble loading the booking panel?{" "}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            Open it in a new tab
          </a>
          .
        </p>
      </section>

      {/* FAQ */}
      <section>
        <div className="text-center mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-2">
            Got questions?
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <Card className="rounded-3xl border-border bg-gradient-to-br from-card to-secondary/30 p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Visit or call us
            </h2>
            <p className="text-muted-foreground mt-2">
              We'd love to show you around Iconic Fitness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Address
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Flat No. 43, Koramangala 1st Block,
                <br />
                Bengaluru, Karnataka
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Phone
              </div>
              <div className="text-sm text-foreground space-y-1">
                <a
                  href="tel:07026276888"
                  className="block hover:text-primary transition-colors"
                >
                  070262 76888
                </a>
                <a
                  href="tel:07026322322"
                  className="block hover:text-primary transition-colors"
                >
                  070263 22322
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </div>
              <a
                href="mailto:iconicfitnessindia@gmail.com"
                className="text-sm text-foreground hover:text-primary transition-colors break-all"
              >
                iconicfitnessindia@gmail.com
              </a>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
