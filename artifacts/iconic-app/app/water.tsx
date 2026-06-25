import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useAddWater,
  useDeleteWater,
  useGetWaterDay,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/ui-bits";
import { ModalHeader } from "@/components/ModalHeader";
import { useColors } from "@/hooks/useColors";
import { formatClock, istToday } from "@/lib/dates";

const QUICK = [250, 500, 750];

export default function WaterScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const dayQuery = useGetWaterDay({ date: istToday() });
  const addWater = useAddWater();
  const deleteWater = useDeleteWater();
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const day = dayQuery.data;
  const ratio = day ? day.totalMl / (day.goalMl || 1) : 0;

  const refresh = async () => {
    await dayQuery.refetch();
    await queryClient.invalidateQueries({
      queryKey: getGetTrackingSummaryQueryKey(),
    });
  };

  const add = async (amountMl: number) => {
    if (busy || amountMl <= 0) return;
    setBusy(true);
    try {
      await addWater.mutateAsync({ data: { amountMl } });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onCustom = async () => {
    const n = Number(custom);
    if (!n) return;
    await add(n);
    setCustom("");
  };

  const remove = async (id: number) => {
    await deleteWater.mutateAsync({ id });
    await refresh();
  };

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Hydration" />

      <Card style={styles.hero}>
        <ProgressRing progress={ratio} size={170} stroke={16} color={colors.water}>
          <Feather name="droplet" size={28} color={colors.water} />
          <AppText weight="700" size={26} style={{ marginTop: 6 }}>
            {((day?.totalMl ?? 0) / 1000).toFixed(2)}L
          </AppText>
          <AppText muted size={13}>
            of {((day?.goalMl ?? 0) / 1000).toFixed(1)}L
          </AppText>
        </ProgressRing>
      </Card>

      <View style={styles.quickRow}>
        {QUICK.map((q) => (
          <Pressable
            key={q}
            onPress={() => add(q)}
            disabled={busy}
            style={({ pressed }) => [
              styles.quick,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="plus" size={16} color={colors.water} />
            <AppText weight="700" size={15}>
              {q}
            </AppText>
            <AppText muted size={11}>
              ml
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <View style={{ flex: 1 }}>
          <Field
            placeholder="Custom amount (ml)"
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
          />
        </View>
        <Button label="Add" onPress={onCustom} full={false} />
      </View>

      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        Today&apos;s log
      </AppText>
      {(day?.entries ?? []).length === 0 ? (
        <EmptyState icon="droplet" title="No water logged yet" />
      ) : (
        <View style={{ gap: 10 }}>
          {(day?.entries ?? []).map((e) => (
            <Card key={e.id} style={styles.entry}>
              <View style={[styles.entryIcon, { backgroundColor: colors.water + "22" }]}>
                <Feather name="droplet" size={16} color={colors.water} />
              </View>
              <AppText weight="600" size={15} style={{ flex: 1 }}>
                {e.amountMl} ml
              </AppText>
              <AppText muted size={12}>
                {formatClock(e.createdAt)}
              </AppText>
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Feather name="trash-2" size={17} color={colors.mutedForeground} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 28 },
  quickRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  quick: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customRow: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginTop: 14 },
  entry: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
