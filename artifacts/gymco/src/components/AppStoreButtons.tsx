import { SiApple, SiGoogleplay } from "react-icons/si";
import { cn } from "@/lib/utils";

export const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.iconicfitness";
export const IOS_APP_URL =
  "https://apps.apple.com/us/app/iconic-fitness-india/id6804717670";

type Size = "sm" | "lg";

const stores = [
  {
    key: "ios",
    href: IOS_APP_URL,
    Icon: SiApple,
    eyebrow: "Download on the",
    name: "App Store",
    label: "Download Iconic Fitness on the App Store for iPhone (opens in a new tab)",
  },
  {
    key: "android",
    href: ANDROID_APP_URL,
    Icon: SiGoogleplay,
    eyebrow: "Get it on",
    name: "Google Play",
    label: "Get Iconic Fitness on Google Play for Android (opens in a new tab)",
  },
] as const;

export function AppStoreButtons({
  size = "sm",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)}>
      {stores.map(({ key, href, Icon, eyebrow, name, label }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          data-testid={`link-store-${key}`}
          className={cn(
            "group inline-flex items-center rounded-xl bg-neutral-900 text-white ring-1 ring-white/10",
            "transition-[transform,box-shadow,background-color] duration-200 ease-out",
            "hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_14px_30px_-14px_hsl(91_56%_30%/0.7)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            lg ? "gap-3 px-5 py-3.5 min-w-[200px]" : "gap-2 px-3.5 py-2.5",
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "shrink-0 transition-colors duration-200 group-hover:text-[hsl(91_52%_58%)] motion-reduce:transition-none",
              lg ? "h-7 w-7" : "h-5 w-5",
            )}
          />
          <span className="flex flex-col leading-none text-left">
            <span className={cn("opacity-75", lg ? "text-[11px] mb-1" : "text-[9px] mb-0.5")}>
              {eyebrow}
            </span>
            <span className={cn("font-black tracking-tight", lg ? "text-xl" : "text-sm")}>
              {name}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
