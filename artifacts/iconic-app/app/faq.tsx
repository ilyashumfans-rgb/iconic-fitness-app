import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";

type Faq = { q: string; a: string };

// Keep this in sync with the website's /faqs page (gymco InfoPage "faqs").
const FAQS: Faq[] = [
  {
    q: "What are your operating hours?",
    a: "Clubs are open 5:00 AM – 11:00 PM, 365 days a year (may vary by location).",
  },
  {
    q: "Can I access all branches?",
    a: "Yes, with an All Club Access membership you can use all participating branches.",
  },
  {
    q: "Are group classes included?",
    a: "Yes, if included in your plan. Class availability and timings may vary.",
  },
  {
    q: "Can I pause my membership?",
    a: "Yes, but only as per your plan terms and subject to management approval.",
  },
  {
    q: "Do you offer Personal Training and diet plans?",
    a: "Yes. Certified trainers and diet consultations are available and may be included in select plans or charged separately.",
  },
  {
    q: "Are facilities like steam and showers available?",
    a: "Available at selected branches only. Please check with your location.",
  },
  {
    q: "Can I transfer my membership?",
    a: "Yes, subject to these conditions: the membership can be transferred only to a non-member of Iconic Fitness (existing members are not eligible); only the gym membership can be transferred — Personal Training packages, diet plans, promotional benefits, add-on services, merchandise or other packages are not transferable; a minimum of 60 days of active membership validity must be remaining at the time of the transfer request; the applicable membership transfer fee must be paid; and all transfers are subject to management approval and verification.",
  },
  {
    q: "What should I bring to the gym?",
    a: "Bring your app/QR code, workout attire, clean shoes, and a water bottle.",
  },
  {
    q: "How do I contact support?",
    a: "Contact your branch directly or use the support option in the Iconic Fitness App.",
  },
];

export default function FaqScreen() {
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen>
      <ModalHeader title="FAQs" />
      <AppText
        size={13}
        style={{ color: colors.mutedForeground, marginBottom: 16 }}
      >
        Everything you need to know about Iconic Fitness.
      </AppText>
      <View style={{ gap: 10, paddingBottom: 24 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <Card key={f.q} tone="elevated" style={{ gap: 0 }}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : i)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
                hitSlop={6}
              >
                <AppText weight="700" size={14} style={{ flex: 1 }}>
                  {f.q}
                </AppText>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
              {isOpen ? (
                <AppText
                  size={13}
                  style={{
                    color: colors.mutedForeground,
                    lineHeight: 20,
                    marginTop: 8,
                  }}
                >
                  {f.a}
                </AppText>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
