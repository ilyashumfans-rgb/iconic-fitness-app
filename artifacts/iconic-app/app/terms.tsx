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
      "Membership is valid only for the selected plan duration.",
      "Plans renew automatically until cancelled. Pricing may change with 30 days' notice.",
      "Plan benefits are subject to fair-use limits stated in your plan.",
      "Membership freezes, extensions, and special requests are subject to company policy and management approval.",
      "Promotional offers cannot be combined unless specifically stated by Iconic Fitness.",
      "Facilities, amenities, and services may vary from branch to branch. Management may change operating hours, schedules, facilities, or policies without prior notice.",
    ],
  },
  {
    heading: "Membership transfer",
    body: [
      "Membership is intended for personal use. It may be transferred only to a new (non-existing) Iconic Fitness member — existing members are not eligible.",
      "Only the membership can be transferred. Personal Training packages, diet plans, promotional offers, add-on services, and any other purchased packages are non-transferable.",
      "A minimum of 60 days of active membership validity must be available at the time of the transfer request.",
      "The applicable membership transfer fee must be paid.",
      "Membership transfer is subject to management approval and verification.",
    ],
  },
  {
    heading: "No Refund Policy",
    body: [
      "All payments made for memberships, Personal Training, diet plans, merchandise, registration fees, transfer fees, or any other services at Iconic Fitness are strictly non-refundable.",
      "Once payment is completed, no refunds (full or partial) will be issued under any circumstances, including but not limited to: change of mind, relocation or travel, medical reasons, non-usage of services, schedule changes, personal reasons, or membership cancellation by the member.",
      "By completing payment, the member confirms that they have read, understood, and accepted these Terms & Conditions and the No Refund Policy.",
    ],
  },
  {
    heading: "Conduct & club rules",
    body: [
      "Members must follow all gym rules, safety guidelines, and staff instructions.",
      "Be respectful to staff and members at every facility.",
      "Follow gym floor rules: wipe down equipment, re-rack weights, wear proper footwear.",
      "Lockers are provided for temporary use only during workouts.",
      "Iconic Fitness is not responsible for the loss, theft, or damage of members' personal belongings.",
      "Any damage caused to gym equipment due to negligence or misuse may be charged to the member.",
      "Misconduct, abusive behaviour, or violation of club policies may result in suspension or cancellation of membership without refund.",
      "Members should consult a qualified medical practitioner before starting any fitness program.",
    ],
  },
  {
    heading: "Health & liability",
    body: "Exercise carries inherent risk. By using Iconic Fitness you acknowledge that Iconic Fitness and its partners are not liable for injury sustained during workouts. Consult a doctor before starting a new program if you have any medical condition, and always train within your ability.",
  },
  {
    heading: "Legal Waiver, Declaration & Indemnity",
    body: [
      "I declare that I am physically and mentally fit to participate in exercise and fitness activities. If I have any medical condition, illness, injury, or health concern, I will consult my doctor before participating.",
      "I understand that physical exercise, strength training, cardio workouts, group classes, and the use of gym equipment involve inherent risks that may result in injury, illness, permanent disability, or, in rare cases, death.",
      "I voluntarily participate in all activities at my own risk and accept full responsibility for any consequences arising from my participation.",
      "I agree to follow all safety instructions, gym rules, and directions given by Iconic Fitness staff and trainers. Failure to do so is entirely my responsibility.",
      "To the fullest extent permitted by applicable law, I release and discharge Iconic Fitness, its directors, shareholders, management, employees, trainers, agents, and affiliates from any claims, demands, losses, damages, injuries, accidents, medical expenses, disability, or death arising from my use of the facilities or participation in any fitness activity, except where caused by the proven negligence or willful misconduct of Iconic Fitness.",
      "I understand that Iconic Fitness does not provide medical treatment or medical supervision and is not responsible for any pre-existing medical condition or any health issue that may arise during or after my workout.",
      "I am responsible for my personal belongings. Iconic Fitness is not liable for any loss, theft, or damage to personal property within the premises.",
      "I agree to indemnify and hold harmless Iconic Fitness from any third-party claims, liabilities, or expenses arising from my actions or violation of the gym's rules and policies.",
      "I confirm that I have carefully read, understood, and voluntarily accepted all Terms & Conditions, the No Refund Policy, and this Legal Waiver before completing my membership.",
      "My payment and/or use of the Iconic Fitness App or facilities constitutes my electronic acceptance of this agreement and is legally binding to the extent permitted under applicable law.",
    ],
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
