import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/ui-bits";
import { WeeklyBars } from "@/components/WeeklyBars";
import { useColors } from "@/hooks/useColors";
import { useBodyStats } from "@/hooks/useBodyStats";
import { formatDateLabel } from "@/lib/dates";
import {
  bmiCategory,
  computeBmi,
  goalProgress,
  latestWeight,
  MEASUREMENT_FIELDS,
  type Measurements,
} from "@/lib/bodyStats";

function parseNum(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function BodyScreen() {
  const colors = useColors();
  const {
    data,
    loading,
    addWeight,
    deleteWeight,
    updateProfile,
    updateMeasurements,
  } = useBodyStats();

  const [weightInput, setWeightInput] = useState("");
  const [editGoals, setEditGoals] = useState(false);
  const [editMeasure, setEditMeasure] = useState(false);

  const current = latestWeight(data);
  const { startKg, goalKg, heightCm } = data.profile;
  const progress = goalProgress(data);

  const bmi =
    current != null && heightCm != null && heightCm > 0
      ? computeBmi(current, heightCm)
      : null;
  const bmiInfo = bmi != null ? bmiCategory(bmi) : null;

  const trend = useMemo(() => {
    const recent = data.weightLog.slice(-7);
    return recent.map((e) => ({
      label: formatDateLabel(e.date).split(",")[0].slice(0, 3),
      value: e.kg,
    }));
  }, [data.weightLog]);

  const onAddWeight = () => {
    const kg = parseNum(weightInput);
    if (kg == null) return;
    addWeight(kg);
    setWeightInput("");
  };

  if (loading) {
    return (
      <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
        <ModalHeader title="Body & Weight" />
        <LoadingView />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Body & Weight" />

      {/* Current weight hero */}
      <Card style={styles.hero}>
        <AppText muted size={13}>
          Current weight
        </AppText>
        <AppText weight="700" size={44}>
          {current != null ? `${current}` : "—"}
          <AppText weight="600" size={20} muted>
            {current != null ? " kg" : ""}
          </AppText>
        </AppText>

        {bmi != null && bmiInfo ? (
          <View
            style={[
              styles.bmiPill,
              { backgroundColor: colors[bmiInfo.tone] + "22" },
            ]}
          >
            <AppText weight="700" size={12} color={colors[bmiInfo.tone]}>
              BMI {bmi.toFixed(1)} · {bmiInfo.label}
            </AppText>
          </View>
        ) : null}

        {progress != null && Number.isFinite(progress) ? (
          <View style={styles.progressWrap}>
            <View style={[styles.track, { backgroundColor: colors.elevated }]}>
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: "100%",
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                }}
              />
            </View>
            <View style={styles.trackLabels}>
              <AppText size={11} muted>
                Start {startKg} kg
              </AppText>
              <AppText size={11} weight="700" color={colors.primary}>
                {Math.round(progress * 100)}%
              </AppText>
              <AppText size={11} muted>
                Goal {goalKg} kg
              </AppText>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Quick log */}
      <View style={styles.logRow}>
        <View style={{ flex: 1 }}>
          <Field
            placeholder="Today's weight (kg)"
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
          />
        </View>
        <Button label="Log" onPress={onAddWeight} full={false} icon="plus" />
      </View>

      {/* Trend */}
      {trend.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <AppText weight="700" size={17} style={{ marginBottom: 14 }}>
            Recent trend
          </AppText>
          <WeeklyBars data={trend} color={colors.primary} suffix="" />
        </Card>
      ) : null}

      {/* Goals */}
      <Card style={{ marginTop: 16 }}>
        <View style={styles.cardHead}>
          <AppText weight="700" size={17}>
            Goals
          </AppText>
          <Pressable onPress={() => setEditGoals((v) => !v)} hitSlop={8}>
            <AppText weight="600" size={13} color={colors.primary}>
              {editGoals ? "Done" : "Edit"}
            </AppText>
          </Pressable>
        </View>

        {editGoals ? (
          <GoalsEditor
            heightCm={heightCm}
            startKg={startKg}
            goalKg={goalKg}
            onSave={(p) => {
              updateProfile(p);
              setEditGoals(false);
            }}
          />
        ) : (
          <View style={styles.statRow}>
            <Stat label="Height" value={heightCm ? `${heightCm} cm` : "—"} />
            <Divider />
            <Stat label="Starting" value={startKg ? `${startKg} kg` : "—"} />
            <Divider />
            <Stat label="Goal" value={goalKg ? `${goalKg} kg` : "—"} />
          </View>
        )}
      </Card>

      {/* Measurements */}
      <Card style={{ marginTop: 16, marginBottom: 8 }}>
        <View style={styles.cardHead}>
          <AppText weight="700" size={17}>
            Measurements
          </AppText>
          <Pressable onPress={() => setEditMeasure((v) => !v)} hitSlop={8}>
            <AppText weight="600" size={13} color={colors.primary}>
              {editMeasure ? "Done" : "Edit"}
            </AppText>
          </Pressable>
        </View>

        {editMeasure ? (
          <MeasurementsEditor
            measurements={data.measurements}
            onSave={(m) => {
              updateMeasurements(m);
              setEditMeasure(false);
            }}
          />
        ) : (
          <View style={styles.measureGrid}>
            {MEASUREMENT_FIELDS.map((f) => {
              const val = data.measurements[f.key];
              return (
                <View key={f.key} style={styles.measureCell}>
                  <AppText muted size={12}>
                    {f.label}
                  </AppText>
                  <AppText weight="700" size={18}>
                    {val != null ? `${val}` : "—"}
                    {val != null ? (
                      <AppText weight="600" size={12} muted>
                        {" "}
                        cm
                      </AppText>
                    ) : null}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* History */}
      {data.weightLog.length > 0 ? (
        <>
          <AppText
            weight="700"
            size={18}
            style={{ marginTop: 16, marginBottom: 12 }}
          >
            Weight history
          </AppText>
          <View style={{ gap: 10 }}>
            {[...data.weightLog].reverse().map((e) => (
              <Card key={e.date} style={styles.histRow}>
                <View
                  style={[
                    styles.histIcon,
                    { backgroundColor: colors.primary + "22" },
                  ]}
                >
                  <Feather name="trending-up" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText weight="700" size={15}>
                    {e.kg} kg
                  </AppText>
                  <AppText muted size={12}>
                    {formatDateLabel(e.date)}
                  </AppText>
                </View>
                <Pressable onPress={() => deleteWeight(e.date)} hitSlop={8}>
                  <Feather
                    name="trash-2"
                    size={17}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function GoalsEditor({
  heightCm,
  startKg,
  goalKg,
  onSave,
}: {
  heightCm?: number;
  startKg?: number;
  goalKg?: number;
  onSave: (p: { heightCm?: number; startKg?: number; goalKg?: number }) => void;
}) {
  const [h, setH] = useState(heightCm != null ? String(heightCm) : "");
  const [s, setS] = useState(startKg != null ? String(startKg) : "");
  const [g, setG] = useState(goalKg != null ? String(goalKg) : "");

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Height (cm)"
        value={h}
        onChangeText={setH}
        keyboardType="decimal-pad"
        placeholder="e.g. 175"
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Starting (kg)"
            value={s}
            onChangeText={setS}
            keyboardType="decimal-pad"
            placeholder="e.g. 80"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Goal (kg)"
            value={g}
            onChangeText={setG}
            keyboardType="decimal-pad"
            placeholder="e.g. 72"
          />
        </View>
      </View>
      <Button
        label="Save goals"
        onPress={() =>
          onSave({
            heightCm: parseNum(h) ?? undefined,
            startKg: parseNum(s) ?? undefined,
            goalKg: parseNum(g) ?? undefined,
          })
        }
      />
    </View>
  );
}

function MeasurementsEditor({
  measurements,
  onSave,
}: {
  measurements: Measurements;
  onSave: (m: Measurements) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = measurements[f.key];
      init[f.key] = v != null ? String(v) : "";
    }
    return init;
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.editGrid}>
        {MEASUREMENT_FIELDS.map((f) => (
          <View key={f.key} style={{ width: "47.5%" }}>
            <Field
              label={`${f.label} (cm)`}
              value={vals[f.key]}
              onChangeText={(t) => setVals((p) => ({ ...p, [f.key]: t }))}
              keyboardType="decimal-pad"
              placeholder="—"
            />
          </View>
        ))}
      </View>
      <Button
        label="Save measurements"
        onPress={() => {
          const next: Measurements = {};
          for (const f of MEASUREMENT_FIELDS) {
            next[f.key] = parseNum(vals[f.key]) ?? undefined;
          }
          onSave(next);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AppText weight="700" size={17}>
        {value}
      </AppText>
      <AppText muted size={12}>
        {label}
      </AppText>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.vline, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8, paddingVertical: 24 },
  bmiPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  progressWrap: { width: "100%", marginTop: 12, gap: 8 },
  track: { height: 10, borderRadius: 999, overflow: "hidden" },
  trackLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    marginTop: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statRow: { flexDirection: "row", alignItems: "center" },
  vline: { width: StyleSheet.hairlineWidth, height: 34 },
  measureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
  },
  measureCell: { width: "33.33%", gap: 2 },
  editGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  histRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  histIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
