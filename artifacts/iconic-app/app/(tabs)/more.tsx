import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

type MoreLink = {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  action: () => void;
};

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();

  const links: MoreLink[] = [
    {
      title: "Train",
      subtitle: "Workouts, programs and guided sessions",
      icon: "activity",
      action: () => router.push("/train"),
    },
    {
      title: "Classes",
      subtitle: "Browse and book group classes",
      icon: "calendar",
      action: () => router.push("/classes"),
    },
    {
      title: "Progress",
      subtitle: "Track your stats, streaks and challenges",
      icon: "bar-chart-2",
      action: () => router.push("/progress"),
    },
    {
      title: "Profile",
      subtitle: "Goals, reminders, theme and account",
      icon: "user",
      action: () => router.push("/profile"),
    },
  ];

  return (
    <Screen>
      <SectionHeader title="More" />
      <View style={{ gap: 12 }}>
        {links.map((link) => (
          <Pressable key={link.title} onPress={link.action}>
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
