import React, { useRef, useState } from "react";
import { useAuth } from "@clerk/expo";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProgress,
  useGetTrackingSummary,
  useAddWater,
  getGetTrackingSummaryQueryKey,
  getGetProgressQueryKey,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istToday } from "@/lib/dates";
import { useBodyStats } from "@/hooks/useBodyStats";

// Import tabs
import { OverviewTab } from "@/components/progress/OverviewTab";
import { BodyTab } from "@/components/progress/BodyTab";
import { WorkoutsTab } from "@/components/progress/WorkoutsTab";
import { NutritionTab } from "@/components/progress/NutritionTab";

type TabType = "Overview" | "Body" | "Workouts" | "Nutrition";
const TABS: TabType[] = ["Overview", "Body", "Workouts", "Nutrition"];

export default function ProgressScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const { userId, isSignedIn } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");

  // State for "More" menu
  const [showMenu, setShowMenu] = useState(false);

  // Queries
  const progressQuery = useGetProgress({ days: 30 }, {
    query: { enabled: !!isSignedIn, queryKey: [...getGetProgressQueryKey({ days: 30 }), userId] },
  }); // Need 30 days for month stats
  const summaryQuery = useGetTrackingSummary({ date: istToday() }, {
    query: { enabled: !!isSignedIn, queryKey: [...getGetTrackingSummaryQueryKey({ date: istToday() }), userId] },
  });
  const { data: bodyData, loading: bodyLoading } = useBodyStats();
  const addWater = useAddWater();

  const report = progressQuery.data;
  const summary = summaryQuery.data;
  const isQueryLoading = progressQuery.isLoading || summaryQuery.isLoading || bodyLoading;

  // Overview Data Processing
  const workoutsThisMonth = report ? report.totalWorkouts : null;
  const activeDaysThisMonth = report ? (report.days || []).filter(d => d.workouts > 0 || d.activeMinutes > 0 || d.caloriesOut > 0).length : null;
  const caloriesBurned = report ? (report.days || []).reduce((sum, d) => sum + (d.caloriesOut || 0), 0) : null;

  // Weight
  const weightLog = bodyData?.weightLog || [];
  const currentWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].kg : null;
  const previousWeight = weightLog.length > 1 ? weightLog[weightLog.length - 2].kg : null;
  const weightChange = currentWeight != null && previousWeight != null ? +(currentWeight - previousWeight).toFixed(1) : null;

  // Water
  const waterIntakeLiters = summary ? (summary.waterMl || 0) / 1000 : 0;
  const waterGoalLiters = summary ? (summary.waterGoalMl || 3000) / 1000 : 3;

  const handleAddWater = async () => {
    try {
      await addWater.mutateAsync({ data: { amountMl: 250 } });
      await summaryQuery.refetch();
      await queryClient.invalidateQueries({
        queryKey: getGetTrackingSummaryQueryKey(),
      });
    } catch (err: any) {
      Alert.alert("Error", "Could not add water");
    }
  };

  const handleLogWeight = () => {
    setActiveTab("Body");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Overview":
        return (
          <OverviewTab
            workoutsThisMonth={workoutsThisMonth}
            activeDaysThisMonth={activeDaysThisMonth}
            caloriesBurned={caloriesBurned}
            currentWeight={currentWeight}
            weightChange={weightChange}
            waterIntakeLiters={waterIntakeLiters}
            waterGoalLiters={waterGoalLiters}
            onAddWater={handleAddWater}
            onLogWeight={handleLogWeight}
          />
        );
      case "Body":
        return <BodyTab />;
      case "Workouts":
        return <WorkoutsTab onEdit={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />;
      case "Nutrition":
        return <NutritionTab />;
    }
  };

  return (
    <Screen
      ref={scrollRef}
      refreshing={progressQuery.isRefetching}
      onRefresh={() => {
        void progressQuery.refetch();
        void summaryQuery.refetch();
      }}
      contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 16 : 8, paddingHorizontal: 16 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <AppText weight="700" size={28}>
          My Progress
        </AppText>
        <Pressable onPress={() => setShowMenu(!showMenu)} hitSlop={10}>
          <Feather name="more-vertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuLink icon="check-circle" label="Habit Tracker" onPress={() => { setShowMenu(false); router.push("/habits"); }} />
          <MenuLink icon="message-circle" label="AI Coach" onPress={() => { setShowMenu(false); router.push("/coach"); }} />
          <MenuLink icon="award" label="Challenges" onPress={() => { setShowMenu(false); router.push("/challenges"); }} />
          <MenuLink icon="file-text" label="Health Report" onPress={() => { setShowMenu(false); router.push("/health-report"); }} />
        </View>
      )}

      {/* Custom Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                ]}
              >
                <AppText
                  size={16}
                  weight={isActive ? "700" : "500"}
                  color={isActive ? colors.text : colors.mutedForeground}
                >
                  {tab}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {isQueryLoading && !report ? <LoadingView /> : renderTabContent()}
      </View>
    </Screen>
  );
}

function MenuLink({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.menuLink}>
      <Feather name={icon} size={18} color={colors.primary} style={{ width: 24 }} />
      <AppText size={15}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    zIndex: 10, // for menu overlay
  },
  menu: {
    position: "absolute",
    top: 50,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
  },
  menuLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  content: {
    flex: 1,
  }
});
