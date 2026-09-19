import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { WeightChart } from "./WeightChart";
import { Card } from "@/components/Card";
import { useBodyStats } from "@/hooks/useBodyStats";

type OverviewTabProps = {
  workoutsThisMonth: number | null;
  activeDaysThisMonth: number | null;
  caloriesBurned: number | null;
  currentWeight: number | null;
  weightChange: number | null;
  waterIntakeLiters: number;
  waterGoalLiters: number;
  onAddWater: () => void;
  onLogWeight: () => void;
};

export function OverviewTab({
  workoutsThisMonth,
  activeDaysThisMonth,
  caloriesBurned,
  currentWeight,
  weightChange,
  waterIntakeLiters,
  waterGoalLiters,
  onAddWater,
  onLogWeight,
}: OverviewTabProps) {
  const colors = useColors();
  const { data: bodyData } = useBodyStats();
  const [period, setPeriod] = useState<"1M" | "3M" | "6M" | "1Y">("3M");

  const waterProgress = waterGoalLiters > 0 ? Math.min(waterIntakeLiters / waterGoalLiters, 1) : 0;

  return (
    <View style={styles.container}>
      {/* 2x2 Grid */}
      <View style={styles.grid}>
        <StatCard icon="activity" label="Workouts" value={workoutsThisMonth == null || workoutsThisMonth === 0 ? "—" : workoutsThisMonth} subLabel="this month" />
        <StatCard icon="calendar" label="Active Days" value={activeDaysThisMonth == null || activeDaysThisMonth === 0 ? "—" : activeDaysThisMonth} subLabel="this month" />
        <StatCard icon="zap" label="Calories" value={caloriesBurned == null || caloriesBurned === 0 ? "—" : caloriesBurned.toLocaleString()} subLabel="burned" iconColor={colors.primary} />
        <StatCard 
          icon="trending-down" 
          label="Weight" 
          value={currentWeight != null ? `${currentWeight} kg` : "—"} 
          subLabel={weightChange != null ? `${weightChange > 0 ? "+" : ""}${weightChange} kg` : "No records"} 
          subColor={weightChange != null && weightChange <= 0 ? colors.primary : colors.destructive}
          iconColor={colors.primary} 
        />
      </View>

      {/* Water Intake */}
      <Card style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.waterLeft}>
          <View style={[styles.waterIconBox, { backgroundColor: colors.water + "22" }]}>
            <Feather name="droplet" size={24} color={colors.water} />
          </View>
          <View style={styles.waterInfo}>
            <AppText muted size={12}>Water Intake</AppText>
            <AppText weight="700" size={16}>
              {waterIntakeLiters.toFixed(1)} L <AppText muted size={14}>of {waterGoalLiters.toFixed(1)} L</AppText>
            </AppText>
            <View style={styles.waterTrackWrapper}>
              <View style={[styles.waterTrack, { backgroundColor: colors.elevated }]}>
                <View style={[styles.waterFill, { width: `${waterProgress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <AppText size={10} muted style={{ marginLeft: 8 }}>{Math.round(waterProgress * 100)}%</AppText>
            </View>
          </View>
        </View>
        <Pressable onPress={onAddWater} style={({pressed}) => [styles.waterAddBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="plus" size={24} color="#000" />
        </Pressable>
      </Card>

      {/* Weight Trend */}
      <WeightChart 
        data={bodyData.weightLog.map(w => ({ date: w.date, value: w.kg }))}
        onLogWeight={onLogWeight}
        period={period}
        setPeriod={setPeriod}
      />
    </View>
  );
}

function StatCard({ icon, label, value, subLabel, iconColor, subColor }: any) {
  const colors = useColors();
  return (
    <Card style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.statHeader}>
        <AppText muted size={14}>{label}</AppText>
        <Feather name={icon} size={18} color={iconColor || colors.mutedForeground} />
      </View>
      <AppText weight="700" size={24} style={{ marginVertical: 4 }}>{value}</AppText>
      <AppText size={12} color={subColor || colors.mutedForeground}>{subLabel}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  statCard: { width: "48%", padding: 16 },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  waterCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  waterLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  waterIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 16 },
  waterInfo: { flex: 1 },
  waterTrackWrapper: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  waterTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  waterFill: { height: "100%", borderRadius: 3 },
  waterAddBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }
});
