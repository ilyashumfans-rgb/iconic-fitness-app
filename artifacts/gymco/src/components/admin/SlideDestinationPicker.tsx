import { useState } from "react";

// Website-only pages use full URLs so Expo opens them in its web viewer,
// rather than attempting to navigate to a native route that does not exist.
const WEBSITE = "https://iconicfitnessindia.com";
export const SLIDE_DESTINATION_GROUPS = [
  {
    label: "Booking & membership",
    pages: [
      ["/trainers", "PT trainers"],
      ["/book-pt-sessions", "Book PT sessions"],
      ["/book-pt-plan", "PT plan after trial"],
      ["/book-package", "Book a membership"],
      ["/my-membership", "My membership"],
      ["/pt-details", "My PT program"],
      ["/classes", "Classes"],
      ["/gyms", "Branches"],
      ["/plans", "Plans"],
    ],
  },
  {
    label: "App pages",
    pages: [
      ["/", "Home"], ["/store", "Store"], ["/cart", "Cart"],
      ["/sports", "Sports"], ["/train", "Training"], ["/progress", "Progress"],
      ["/profile", "My profile"], ["/more", "More"],
      ["/community", "Community"], ["/challenges", "Challenges"],
      ["/coach", "AI fitness coach"], ["/assessment", "Fitness assessment"],
      ["/fitness-journey", "Fitness journey"], ["/engagement-plan", "Engagement plan"],
      ["/workouts", "Workouts"], ["/workout/generate", "Create a workout"],
      ["/diet", "Diet"], ["/meal-plans", "Meal plans"], ["/habits", "Habits"],
      ["/water", "Water tracker"], ["/body", "Body measurements"],
      ["/health-report", "Health report"], ["/connect-watch", "Connect a watch"],
      ["/attendance", "Attendance"], ["/check-in", "Check in"],
      ["/refer", "Refer & earn"], ["/orders", "My orders"],
      ["/invoices", "Invoices"], ["/notifications", "Notifications"],
      ["/complaint", "Submit a complaint"], ["/faq", "App help & FAQs"],
    ],
  },
  {
    label: "Website pages",
    pages: [
      ["/contact", "Contact us — enquiry form"], ["/about", "About us"],
      ["/explore", "Explore"], ["/memberships", "Membership information"],
      ["/offers", "Offers"], ["/be-a-member", "Become a member"],
      ["/blog", "Blog"], ["/press", "Press"], ["/careers", "Careers"],
      ["/become-a-trainer", "Become a trainer"], ["/corporate", "Corporate fitness"],
      ["/help", "Help"], ["/support", "Support"], ["/faqs", "Website FAQs"],
      ["/safety", "Safety"], ["/refund", "Refund policy"],
      ["/privacy", "Privacy policy"], ["/terms", "Terms & conditions"],
      ["/cookies", "Cookie policy"],
    ].map(([path, label]) => [`${WEBSITE}${path}`, label]),
  },
];

export function SlideDestinationPicker({
  value, onChange, className,
}: { value: string; onChange: (value: string) => void; className: string }) {
  const [custom, setCustom] = useState(false);
  const known = SLIDE_DESTINATION_GROUPS.some(group =>
    group.pages.some(([path]) => path === value));
  const showCustom = custom || (!!value && !known);
  return (
    <div className="space-y-2">
      <label className="block text-[12px] font-semibold text-slate-600">
        Open page when image is clicked
        <select
          className={`${className} mt-1`}
          value={showCustom ? "__custom__" : value}
          onChange={event => {
            const next = event.target.value;
            setCustom(next === "__custom__");
            onChange(next === "__custom__" ? "" : next);
          }}
        >
          <option value="">Default action (explore branches)</option>
          {SLIDE_DESTINATION_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.pages.map(([path, label]) => <option key={path} value={path}>{label}</option>)}
            </optgroup>
          ))}
          <option value="__custom__">Custom page or website URL…</option>
        </select>
      </label>
      {showCustom && <input
        className={className}
        aria-label="Custom destination"
        placeholder="/gym/12 or https://example.com/page"
        value={value}
        onChange={event => onChange(event.target.value)}
      />}
      <p className="text-xs text-slate-500">
        The entire hero image opens this page. A button label is optional.
        Website pages open in the app’s web viewer. Protected pages still require sign-in.
      </p>
    </div>
  );
}