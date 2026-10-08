import { useEffect } from "react";
import { Link } from "wouter";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { ArrowUpRight, Dumbbell, CalendarCheck, MapPin, ShoppingBag } from "lucide-react";
import { ANDROID_APP_URL, IOS_APP_URL, AppStoreButtons } from "@/components/AppStoreButtons";

const SITE = "https://iconicfitnessindia.com";
const TITLE = "Download the Iconic Fitness App | iOS & Android";
const DESC =
  "Get the Iconic Fitness app on the App Store or Google Play. Find gyms, book classes and manage your membership from your phone.";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function useDownloadMeta() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = TITLE;
    const url = `${SITE}/download`;
    const image = `${SITE}/media/iconic-fitness-logo-transparent.png`;
    setMeta("name", "description", DESC);
    setMeta("property", "og:title", TITLE);
    setMeta("property", "og:description", DESC);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", TITLE);
    setMeta("name", "twitter:description", DESC);
    setMeta("name", "twitter:image", image);
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const created = !canon;
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    const prevCanon = canon.href;
    canon.href = url;
    return () => {
      document.title = prevTitle;
      if (created) canon?.remove();
      else if (canon) canon.href = prevCanon;
    };
  }, []);
}

const features = [
  { Icon: MapPin, title: "Find gyms near you", body: "Browse partner gyms across India and see what each one offers." },
  { Icon: CalendarCheck, title: "Book classes", body: "Reserve group classes and trainer sessions in a few taps." },
  { Icon: Dumbbell, title: "Your membership, in hand", body: "Check plans, bookings and your wallet wherever you train." },
  { Icon: ShoppingBag, title: "Shop the store", body: "Order fitness gear and nutrition from the Iconic store." },
];

const choices = [
  {
    key: "ios",
    href: IOS_APP_URL,
    Icon: SiApple,
    platform: "iPhone",
    store: "App Store",
    cta: "Download on the App Store",
  },
  {
    key: "android",
    href: ANDROID_APP_URL,
    Icon: SiGoogleplay,
    platform: "Android",
    store: "Google Play",
    cta: "Get it on Google Play",
  },
] as const;

export default function Download() {
  useDownloadMeta();

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(91 52% 51%) 1px, transparent 1px), linear-gradient(90deg, hsl(91 52% 51%) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%)",
          }}
        />
        <div aria-hidden="true" className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-[hsl(91_52%_45%/0.28)] blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-20 md:pb-28 text-center">
          <img
            src={`${import.meta.env.BASE_URL}media/iconic-fitness-logo-transparent.png`}
            alt="Iconic Fitness"
            className="h-32 md:h-40 w-auto max-w-full object-contain mx-auto mb-8"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[hsl(91_52%_58%)] mb-4">
            The Iconic Fitness app
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95]">
            Your gym pass
            <br />
            <span className="text-[hsl(91_52%_58%)]">lives in your pocket.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/70 max-w-xl mx-auto">
            Find gyms, book classes and manage your membership from one app.
            Pick your phone below.
          </p>

          {/* Choice cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            {choices.map(({ key, href, Icon, platform, store, cta }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${cta} — Iconic Fitness for ${platform} (opens in a new tab)`}
                data-testid={`link-download-${key}`}
                className="group relative flex items-center gap-5 rounded-3xl bg-white/[0.06] ring-1 ring-white/15 p-6 md:p-7 transition-[transform,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.1] hover:ring-[hsl(91_52%_51%/0.7)] hover:shadow-[0_30px_60px_-30px_hsl(91_56%_40%/0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(91_52%_58%)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="grid place-items-center h-16 w-16 shrink-0 rounded-2xl bg-white text-neutral-950 transition-colors duration-300 group-hover:bg-[hsl(91_52%_51%)] motion-reduce:transition-none">
                  <Icon aria-hidden="true" className="h-8 w-8" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs uppercase tracking-[0.2em] text-white/55">For {platform}</span>
                  <span className="block text-2xl md:text-3xl font-black tracking-tight">{store}</span>
                  <span className="block text-sm text-white/65 mt-1">{cta}</span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-6 w-6 text-white/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[hsl(91_52%_58%)] motion-reduce:transition-none"
                />
              </a>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/45">Free to download. Opens the official store listing.</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">Inside the app</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.02]">
              Less admin. <span className="text-gradient-brand">More training.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything you do on iconicfitnessindia.com, ready on your phone when you walk into the gym.
            </p>
          </div>
          <ol className="divide-y divide-border border-y border-border">
            {features.map(({ Icon, title, body }, i) => (
              <li key={title} className="flex gap-5 py-6">
                <span className="font-mono text-sm text-muted-foreground pt-1">0{i + 1}</span>
                <Icon aria-hidden="true" className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand-deep text-white p-8 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Ready when you are.</h2>
            <p className="mt-2 text-white/80">
              Prefer the browser?{" "}
              <Link href="/explore" className="underline underline-offset-4 font-semibold hover:text-white">
                Browse gyms on the web
              </Link>
              .
            </p>
          </div>
          <AppStoreButtons size="lg" />
        </div>
      </section>
    </div>
  );
}
