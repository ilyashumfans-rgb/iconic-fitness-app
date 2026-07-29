import { Feather } from "@expo/vector-icons";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";

type Section = { heading: string; body: string | string[] };

// Keep this in sync with the website's /terms page (gymco InfoPage "terms").
const SECTIONS: Section[] = [
  {
    heading: "Acceptance",
    body: "By creating an Iconic Fitness account or using our facilities, you agree to these terms. If you don't agree, please don't use the service.",
  },
  {
    heading: "Eligibility",
    body: "You must be 16 or older to create an account. Members under 18 require parental consent for paid plans.",
  },
  {
    heading: "Membership",
    body: [
      "Plans renew automatically until cancelled. Pricing may change with 30 days' notice.",
      "Plan benefits are subject to fair-use limits stated in your plan.",
      "Your membership is personal and non-transferable unless approved by the branch.",
    ],
  },
  {
    heading: "Payments & refunds",
    body: [
      "All membership payments are non-refundable under normal circumstances.",
      "You can cancel to stop future billing; no refund is issued for the current or remaining period.",
      "For genuine emergencies, contact support and our team will review your case.",
    ],
  },
  {
    heading: "Conduct",
    body: [
      "Be respectful to staff and members at every facility.",
      "Follow gym floor rules: wipe down equipment, re-rack weights, wear proper footwear.",
      "Repeated violations may result in account suspension without refund.",
    ],
  },
  {
    heading: "Health & liability",
    body: "Exercise carries inherent risk. By using Iconic Fitness you acknowledge that Iconic Fitness and its partners are not liable for injury sustained during workouts. Consult a doctor before starting a new program if you have any medical condition, and always train within your ability.",
  },
  {
    heading: "Privacy",
    body: "We collect only what we need to run your membership — see the Privacy Policy on our website for full details. We never sell your data to advertisers.",
  },
  {
    heading: "Governing law",
    body: "These terms are governed by the laws of India. Disputes are subject to the courts of Bengaluru.",
  },
  {
    heading: "Contact",
    body: "Questions about these terms? Email iconicfitnessindia@gmail.com or call 070262 76888 (Mon–Sat, 9 AM – 9 PM IST).",
  },
];

export default function TermsScreen() {
  const colors = useColors();
  return (
    <Screen>
      <ModalHeader title="Terms & Conditions" />
      <AppText
        size={13}
        style={{ color: colors.mutedForeground, marginBottom: 16 }}
      >
        Last updated · May 2026
      </AppText>
      <View style={{ gap: 12, paddingBottom: 24 }}>
        {SECTIONS.map((s) => (
          <Card key={s.heading} tone="elevated" style={{ gap: 8 }}>
            <AppText weight="700" size={15}>
              {s.heading}
            </AppText>
            {Array.isArray(s.body) ? (
              s.body.map((line, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
                >
                  <Feather
                    name="check"
                    size={14}
                    color={colors.primary}
                    style={{ marginTop: 3 }}
                  />
                  <AppText
                    size={13}
                    style={{ color: colors.mutedForeground, flex: 1, lineHeight: 20 }}
                  >
                    {line}
                  </AppText>
                </View>
              ))
            ) : (
              <AppText
                size={13}
                style={{ color: colors.mutedForeground, lineHeight: 20 }}
              >
                {s.body}
              </AppText>
            )}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
