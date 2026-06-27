import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

type MoreLink = {
  href: Href;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
};

const LINKS: MoreLink[] = [
  {
    href: "/classes",
    title: "Classes",
    subtitle: "Browse and book group classes",
    icon: "calendar",
  },
  {
    href: "/progress",
    title: "Progress",
    subtitle: "Track your stats, streaks and challenges",
    icon: "bar-chart-2",
  },
  {
    href: "/profile",
    title: "Profile",
    subtitle: "Goals, reminders, theme and account",
    icon: "user",
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Screen>
      <SectionHeader title="More" />
      <View style={{ gap: 12 }}>
        {LINKS.map((link) => (
          <Pressable key={link.title} onPress={() => router.push(link.href)}>
            <Card
              tone="elevated"
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                }}
              >
                <Feather
                  name={link.icon}
                  size={22}
                  color={colors.primaryForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={16}>
                  {link.title}
                </AppText>
                <AppText muted size={13} style={{ marginTop: 2 }}>
                  {link.subtitle}
                </AppText>
              </View>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.mutedForeground}
              />
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
