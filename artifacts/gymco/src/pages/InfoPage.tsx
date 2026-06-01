import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  GraduationCap,
  Shield,
  LifeBuoy,
  ScrollText,
  Cookie,
  FileText,
  HelpCircle,
  Newspaper,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type Section = { heading?: string; body: string | string[] };

type InfoContent = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: Section[];
  showContactForm?: boolean;
  showFaq?: { q: string; a: string }[];
};

const CONTENT: Record<string, InfoContent> = {
  about: {
    slug: "about",
    eyebrow: "About Iconic Fitness",
    title: "One membership. Unlimited gyms in Bangalore.",
    icon: Building2,
    subtitle:
      "We're building India's most loved fitness pass — starting with Bangalore.",
    sections: [
      {
        heading: "Our story",
        body: "Iconic Fitness started in 2024 in Indiranagar with a simple idea: people don't want to be locked into one gym. They want to train near home on weekdays, by the office at lunch, and try yoga or MMA on weekends. We partnered with the city's best studios so one pass unlocks them all.",
      },
      {
        heading: "What we believe",
        body: [
          "Movement should be a habit, not a contract.",
          "Premium facilities should be accessible to everyone.",
          "Partners win when members win.",
          "Software should disappear — open the app, scan, train.",
        ],
      },
      {
        heading: "By the numbers",
        body: "120+ partner gyms across Bangalore · 8,000+ classes booked every month · 95% member retention after 90 days.",
      },
    ],
  },
  press: {
    slug: "press",
    eyebrow: "Press",
    title: "Iconic Fitness in the news",
    icon: Newspaper,
    subtitle:
      "Media kit, founder interviews and press inquiries — everything in one place.",
    sections: [
      {
        heading: "Recent coverage",
        body: [
          "YourStory · How Iconic Fitness is rewriting the gym membership in India",
          "Inc42 · 120 gyms, one pass: Bangalore's fitness experiment",
          "Economic Times · The rise of the all-access fitness membership",
        ],
      },
      {
        heading: "Press inquiries",
        body: "For interviews, quotes or media assets, write to iconicfitnessindia@gmail.com. We respond within one business day.",
      },
      {
        heading: "Brand assets",
        body: "Logo, screenshots and founder photos available on request.",
      },
    ],
  },
  careers: {
    slug: "careers",
    eyebrow: "Careers",
    title: "Build the future of fitness with us",
    icon: Briefcase,
    subtitle:
      "We're a small team in Bangalore obsessed with helping people move more.",
    sections: [
      {
        heading: "Open roles",
        body: [
          "Senior Product Designer — Bangalore (hybrid)",
          "Full-stack Engineer (React / Node) — Bangalore",
          "Partner Success Manager — Bangalore",
          "City Marketing Lead — Bangalore",
          "Customer Experience Associate — Bangalore",
        ],
      },
      {
        heading: "Why Iconic Fitness",
        body: "Free Elite membership for every employee · Annual learning budget · Health insurance for you and your family · Real ownership through ESOPs.",
      },
      {
        heading: "Apply",
        body: "Send your resume and a short note to iconicfitnessindia@gmail.com with the role in the subject line.",
      },
    ],
  },
  "become-a-trainer": {
    slug: "become-a-trainer",
    eyebrow: "For trainers",
    title: "Coach on Iconic Fitness",
    icon: GraduationCap,
    subtitle:
      "Get discovered by members across Bangalore who are looking for serious coaching.",
    sections: [
      {
        heading: "Who we work with",
        body: "Certified personal trainers, strength coaches, yoga instructors, pilates teachers, physios and nutritionists. We verify every trainer before listing.",
      },
      {
        heading: "What you get",
        body: [
          "A public profile with reviews and specialties.",
          "Bookings handled in-app — no chasing payments.",
          "70% trainer payout, paid weekly.",
          "Free access to all partner gyms while coaching.",
        ],
      },
      {
        heading: "Apply",
        body: "Use the form below or email iconicfitnessindia@gmail.com with your certifications and a short bio.",
      },
    ],
    showContactForm: true,
  },
  corporate: {
    slug: "corporate",
    eyebrow: "Corporate plans",
    title: "Wellness benefits your team will actually use",
    icon: Sparkles,
    subtitle:
      "Give your employees access to 120+ gyms in Bangalore — one bill, full visibility.",
    sections: [
      {
        heading: "Why companies choose Iconic Fitness",
        body: [
          "Up to 25% off retail pricing on bulk seats.",
          "Live engagement dashboard for HR.",
          "Onboarding sessions and wellness workshops.",
          "Add or remove employees in seconds.",
          "Family add-ons available.",
        ],
      },
      {
        heading: "How it works",
        body: "Tell us your team size, we send a tailored proposal within 24 hours. Pilot with 10 seats, scale when you're ready.",
      },
      {
        heading: "Request a proposal",
        body: "Fill the form below or email iconicfitnessindia@gmail.com.",
      },
    ],
    showContactForm: true,
  },
  help: {
    slug: "help",
    eyebrow: "Help center",
    title: "How can we help?",
    icon: LifeBuoy,
    subtitle:
      "Most questions answered in under a minute. Can't find what you need? Talk to us.",
    sections: [],
    showFaq: [
      {
        q: "Can I freeze my membership?",
        a: "Yes — pause for up to 30 days per year from Profile → Membership.",
      },
      {
        q: "Do I need to book in advance?",
        a: "Gym access is included with your pass — just show your membership. Group classes and trainer sessions need to be booked in the app.",
      },
      {
        q: "What if a gym is full?",
        a: "Open another nearby gym in the app — your pass works at all 120+ partner gyms in Bangalore.",
      },
      {
        q: "Can I bring a guest?",
        a: "Elite members get 2 guest passes per month. Upgrade in Profile → Membership.",
      },
    ],
  },
  contact: {
    slug: "contact",
    eyebrow: "Contact",
    title: "Talk to a human",
    icon: Mail,
    subtitle:
      "We reply to every message within one business day — usually faster.",
    sections: [
      {
        heading: "Reach us directly",
        body: ["iconicfitnessindia@gmail.com"],
      },
      {
        heading: "Phone",
        body: "070262 76888 · 070263 22322 · Mon–Sat, 9 AM – 9 PM IST",
      },
      {
        heading: "Office",
        body: "Iconic Fitness India Pvt. Ltd., Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka",
      },
    ],
    showContactForm: true,
  },
  faqs: {
    slug: "faqs",
    eyebrow: "FAQs",
    title: "Frequently asked questions",
    icon: HelpCircle,
    subtitle: "Everything you need to know about Iconic Fitness.",
    sections: [],
    showFaq: [
      {
        q: "What is Iconic Fitness?",
        a: "Iconic Fitness is one of Bengaluru's leading fitness chains offering top-class gym facilities, personal training, group classes, and diet consultations. Our goal is to help you transform your fitness journey safely and effectively.",
      },
      {
        q: "Where are your branches located?",
        a: "We have multiple branches across Bengaluru: Koramangala (1st, ST Bed, 5th, 7th Block), BTM Layout & Thavarekere, Maruti Nagar, HSR Layout (Sector 2 & 7), Indiranagar 80 Feet Road, JP Nagar (7th Phase & Puttanahalli), Bellandur (Green Glan Layout & next to Centro Mall), Marathahalli, Brookfield, and Whitefield – Seegehalli. All memberships provide access to every Iconic Fitness location.",
      },
      {
        q: "What are your operating hours?",
        a: "5:00 AM to 11:00 PM (some branches open till 12:00 AM). We're open all 7 days, 365 days a year.",
      },
      {
        q: "What membership plans do you offer?",
        a: "1 Month – ₹3,540 (incl. taxes), 3 Months – ₹7,260 (incl. taxes), 6 Months – ₹8,999 (incl. taxes), 12 Months – ₹17,999 (incl. taxes). Limited-time offer: 15 months for ₹9,999 + taxes (limited slots only).",
      },
      {
        q: "What's included in the membership?",
        a: "Unlimited gym access, group classes (Zumba, HIIT, Yoga, Aerobics and more), locker & shower facilities, access to all branches, and a free diet consultation with our in-house dietician.",
      },
      {
        q: "Are personal trainers available?",
        a: "Yes. Certified personal trainers are available at all branches. Personal training sessions are charged separately.",
      },
      {
        q: "What are your group class timings?",
        a: "Morning: 7:00 AM – 8:00 AM and Evening: 7:00 PM – 8:00 PM, Monday to Saturday. Beginner-friendly classes with trial sessions available.",
      },
      {
        q: "Do you have a dietician?",
        a: "Yes, we have an in-house dietician who provides customized meal plans for weight loss, muscle gain, and fitness goals.",
      },
    ],
  },
  cancellation: {
    slug: "cancellation",
    eyebrow: "Policy",
    title: "Cancellation policy",
    icon: ScrollText,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "Membership cancellation",
        body: "Memberships can be cancelled anytime from Profile → Membership. Cancellation stops future billing and takes effect at the end of the current billing cycle. Memberships are non-refundable, so no refund is issued for the current or remaining period.",
      },
      {
        heading: "Emergencies",
        body: "For genuine emergencies or exceptional circumstances, please contact our support team — WhatsApp +91 94800 00248 or email iconicfitnessindia@gmail.com — and we'll review your case.",
      },
      {
        heading: "Class booking cancellation",
        body: "Free cancellation up to 4 hours before class start. Cancellations within 4 hours forfeit the class credit. No-shows count as a used class.",
      },
      {
        heading: "Trainer sessions",
        body: "Free cancellation up to 12 hours before session. Within 12 hours, 50% credit applies. No-shows are charged in full.",
      },
      {
        heading: "Need help cancelling?",
        body: "Contact our support team on WhatsApp at +91 94800 00248 or email iconicfitnessindia@gmail.com and we'll help you the same day.",
      },
    ],
  },
  safety: {
    slug: "safety",
    eyebrow: "Safety",
    title: "Safety guidelines",
    icon: Shield,
    subtitle: "Train hard. Train safe.",
    sections: [
      {
        heading: "Before you train",
        body: [
          "Warm up for at least 5 minutes before any heavy lifting.",
          "Hydrate — bring a bottle and refill as needed.",
          "If it's your first time at a facility, ask staff for a quick orientation.",
        ],
      },
      {
        heading: "At the gym",
        body: [
          "Wipe down equipment after every set.",
          "Wear proper closed-toe shoes in the weights area.",
          "Use collars on barbells. Re-rack everything.",
          "Don't lift heavy without a spotter or safety pins.",
        ],
      },
      {
        heading: "Medical conditions",
        body: "Members with heart conditions, joint injuries or pregnancy should consult a doctor before starting any new program and inform the gym staff on arrival.",
      },
      {
        heading: "Reporting incidents",
        body: "If you witness or are involved in any incident, notify the gym immediately and email iconicfitnessindia@gmail.com. We take every report seriously.",
      },
    ],
  },
  refund: {
    slug: "refund",
    eyebrow: "Policy",
    title: "Refund policy",
    icon: ScrollText,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "No refunds",
        body: "All membership payments are non-refundable. Once a membership is purchased, the amount paid cannot be refunded under normal circumstances. You can cancel your membership to stop future billing, but no refund will be issued for the current or remaining period.",
      },
      {
        heading: "Emergencies",
        body: "If you have a genuine emergency or exceptional circumstance, please contact our support team and we'll do our best to help. Reach us on WhatsApp at +91 94800 00248 or email iconicfitnessindia@gmail.com, and our team will review your case.",
      },
      {
        heading: "Class & trainer credits",
        body: "Unused class and trainer credits expire at the end of your billing cycle and are not refundable in cash.",
      },
      {
        heading: "Billing disputes",
        body: "If you believe you've been charged incorrectly, contact our support team within 30 days of the charge — WhatsApp +91 94800 00248 or email iconicfitnessindia@gmail.com — and we'll investigate.",
      },
    ],
  },
  privacy: {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    icon: Shield,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "What we collect",
        body: "Account info (name, email, phone), visit history, payment info (processed by our payment partners — we never store full card numbers), device and usage data, and optional location data for finding nearby gyms.",
      },
      {
        heading: "How we use it",
        body: "To operate your membership, process payments, prevent fraud, send service updates, personalise gym and class recommendations, and improve the product.",
      },
      {
        heading: "Who we share with",
        body: "Partner gyms receive your name and member ID when you visit. Payment processors handle billing. We never sell your data to advertisers.",
      },
      {
        heading: "Your rights",
        body: "Access, export or delete your data anytime from Profile → Privacy. Or email iconicfitnessindia@gmail.com.",
      },
      {
        heading: "Contact",
        body: "Questions about privacy? Reach our Data Protection Officer at iconicfitnessindia@gmail.com.",
      },
    ],
  },
  terms: {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of service",
    icon: FileText,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "Acceptance",
        body: "By creating a Iconic Fitness account, you agree to these terms. If you don't agree, please don't use the service.",
      },
      {
        heading: "Eligibility",
        body: "You must be 16 or older to create an account. Members under 18 require parental consent for paid plans.",
      },
      {
        heading: "Membership",
        body: "Plans renew automatically until cancelled. Pricing may change with 30 days' notice. Plan benefits are subject to fair-use limits stated in your plan.",
      },
      {
        heading: "Conduct",
        body: "Be respectful to staff and members at every partner facility. Repeated violations may result in account suspension without refund.",
      },
      {
        heading: "Liability",
        body: "Exercise carries inherent risk. By using Iconic Fitness you acknowledge that Iconic Fitness and its partners are not liable for injury sustained during workouts. Always train within your ability.",
      },
      {
        heading: "Governing law",
        body: "These terms are governed by the laws of India. Disputes are subject to the courts of Bangalore.",
      },
    ],
  },
  cookies: {
    slug: "cookies",
    eyebrow: "Legal",
    title: "Cookie policy",
    icon: Cookie,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "What are cookies",
        body: "Small text files stored by your browser when you visit a website. They help us remember your preferences and keep you signed in.",
      },
      {
        heading: "Cookies we use",
        body: [
          "Essential — sign-in, session, security. Cannot be disabled.",
          "Analytics — anonymous traffic patterns to improve the product.",
          "Preferences — theme, city, language.",
          "Marketing — measure campaign effectiveness (opt-in).",
        ],
      },
      {
        heading: "Managing cookies",
        body: "You can clear or block cookies in your browser settings. Disabling essential cookies will prevent sign-in from working.",
      },
      {
        heading: "Third parties",
        body: "Payment partners and analytics providers may set their own cookies. See their respective policies for details.",
      },
    ],
  },
};

function ContactForm({ topic }: { topic: string }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({
        title: "Add a few more details",
        description: "Name, email and a short message help us route this faster.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "general",
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          message: `[${topic}] ${form.message}`,
          source: `info:${topic}`,
        }),
      });
      setDone(true);
    } catch {
      toast({
        title: "Couldn't send",
        description: "Please email us directly at iconicfitnessindia@gmail.com.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center border-emerald-500/30 bg-emerald-500/5">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-xl font-black tracking-tight">
          Thanks — message received.
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Our team will get back to you within one business day.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 border-border/60">
      <h3 className="text-xl md:text-2xl font-black tracking-tight">
        Send us a note
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        We respond within one business day.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11"
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11"
          />
        </div>
        <Input
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="h-11"
        />
        <Textarea
          placeholder="How can we help?"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <Button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto bg-gradient-brand text-white border-none font-black tracking-wider h-11 px-6"
        >
          {submitting ? "SENDING..." : "SEND MESSAGE"}{" "}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </form>
    </Card>
  );
}

export default function InfoPage({ slug }: { slug: string }) {
  const content = CONTENT[slug];

  if (!content) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-black">Page not found</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 mt-4 text-lime-600 font-bold"
        >
          Back home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const Icon = content.icon;

  return (
    <>
      <div className="max-w-4xl mx-auto py-6 md:py-10">
        <div className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-[10.5px] font-black tracking-[0.22em] text-lime-600 uppercase mb-5">
            <Icon className="h-3.5 w-3.5" /> {content.eyebrow}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05]">
            {content.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl">
            {content.subtitle}
          </p>
        </div>

        <div className="space-y-8 md:space-y-10">
          {content.sections.map((s, i) => (
            <section key={i}>
              {s.heading && (
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-3">
                  {s.heading}
                </h2>
              )}
              {Array.isArray(s.body) ? (
                <ul className="space-y-2">
                  {s.body.map((line, k) => (
                    <li
                      key={k}
                      className="flex gap-3 text-muted-foreground leading-relaxed"
                    >
                      <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-lime-500 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {s.body}
                </p>
              )}
            </section>
          ))}
        </div>

        {content.showFaq && (
          <div className="mt-10 space-y-3">
            {content.showFaq.map((f, i) => (
              <Card
                key={i}
                className="p-5 md:p-6 border-border/60 hover:border-lime-500/40 transition-colors"
              >
                <h3 className="font-black tracking-tight text-base md:text-lg">
                  {f.q}
                </h3>
                <p className="text-muted-foreground mt-1.5 text-sm md:text-[15px] leading-relaxed">
                  {f.a}
                </p>
              </Card>
            ))}
          </div>
        )}

        {content.showContactForm && (
          <div className="mt-12">
            <ContactForm topic={content.title} />
          </div>
        )}

        {/* Quick contact strip */}
        <Card className="mt-12 p-6 md:p-8 bg-gradient-to-br from-lime-500/8 via-card to-card border-lime-500/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <a
              href="mailto:iconicfitnessindia@gmail.com"
              className="flex items-start gap-3 group"
            >
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Email
                </div>
                <div className="font-bold group-hover:text-lime-600 transition-colors break-all">
                  iconicfitnessindia@gmail.com
                </div>
              </div>
            </a>
            <a
              href="tel:07026276888"
              className="flex items-start gap-3 group"
            >
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Phone
                </div>
                <div className="font-bold group-hover:text-lime-600 transition-colors">
                  070262 76888 · 070263 22322
                </div>
              </div>
            </a>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Office
                </div>
                <div className="font-bold">Koramangala 1st Block, Bengaluru</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
