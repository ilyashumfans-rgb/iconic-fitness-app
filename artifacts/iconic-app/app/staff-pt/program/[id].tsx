import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import { istDateLabel } from "@/lib/dates";
import { EXERCISES, type Exercise } from "@/lib/exercises";
import {
  staffPtApi,
  type AssignedExercise,
  type BmiRecord,
  type DietPlan,
  type PtProgram,
} from "@/lib/staffPt";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function StaffPtProgramScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <Content />
    </ThemeContext.Provider>
  );
}

function Content() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const programId = Number(params.id);

  const [program, setProgram] = useState<PtProgram | null>(null);
  const [bmi, setBmi] = useState<BmiRecord[]>([]);
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [exercises, setExercises] = useState<AssignedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // BMI form
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bmiNote, setBmiNote] = useState("");
  // Diet form
  const [dietTitle, setDietTitle] = useState("");
  const [dietContent, setDietContent] = useState("");
  // Exercise form
  const [exSearch, setExSearch] = useState("");
  const [exPicked, setExPicked] = useState<Exercise | null>(null);
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");
  const [exNote, setExNote] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await staffPtApi.program(programId);
      setProgram(data.program);
      setBmi(data.bmi);
      setDiets(data.diets);
      setExercises(Array.isArray(data.exercises) ? data.exercises : []);
    } catch (e) {
      notify("Could not load", e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    if (Number.isFinite(programId)) void load();
  }, [load, programId]);

  const act = useCallback(
    async (key: string, fn: () => Promise<unknown>, doneMsg?: string) => {
      setBusy(key);
      try {
        await fn();
        if (doneMsg) notify("Done", doneMsg);
      } catch (e) {
        notify("Could not update", e instanceof Error ? e.message : "");
      } finally {
        setBusy(null);
        void load();
      }
    },
    [load],
  );

  const addBmi = useCallback(async () => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
      notify("Check values", "Enter height in cm and weight in kg.");
      return;
    }
    await act(
      "bmi",
      async () => {
        await staffPtApi.addBmi({ programId, heightCm: h, weightKg: w, note: bmiNote.trim() });
        setHeightCm("");
        setWeightKg("");
        setBmiNote("");
      },
      "BMI record saved — the member can see it in their app.",
    );
  }, [act, programId, heightCm, weightKg, bmiNote]);

  const addDiet = useCallback(async () => {
    if (!dietContent.trim()) {
      notify("Empty plan", "Write the diet plan first.");
      return;
    }
    await act(
      "diet",
      async () => {
        await staffPtApi.addDiet({
          programId,
          title: dietTitle.trim(),
          content: dietContent.trim(),
        });
        setDietTitle("");
        setDietContent("");
      },
      "Diet plan saved — the member can see it in their app.",
    );
  }, [act, programId, dietTitle, dietContent]);

  const addExercise = useCallback(async () => {
    if (!exPicked) {
      notify("Pick an exercise", "Search the library and tap an exercise first.");
      return;
    }
    await act(
      "exercise",
      async () => {
        await staffPtApi.addExercise({
          programId,
          exerciseSlug: exPicked.slug,
          exerciseName: exPicked.name,
          sets: exSets.trim(),
          reps: exReps.trim(),
          note: exNote.trim(),
        });
        setExPicked(null);
        setExSearch("");
        setExSets("");
        setExReps("");
        setExNote("");
      },
      "Exercise assigned — the member can see it in their app.",
    );
  }, [act, programId, exPicked, exSets, exReps, exNote]);

  const removeExercise = useCallback(
    (id: number) =>
      act(`removeEx${id}`, () => staffPtApi.removeExercise(id)),
    [act],
  );

  const exMatches =
    exSearch.trim().length >= 2 && !exPicked
      ? EXERCISES.filter((e) => {
          const q = exSearch.trim().toLowerCase();
          return (
            e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)
          );
        }).slice(0, 6)
      : [];

  const inputStyle = [
    styles.input,
    { backgroundColor: "#fff", color: "#000", borderColor: colors.border },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 44) + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          paddingHorizontal: 20,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <AppText weight="700" size={18}>
            {program?.memberName || "Member"}
          </AppText>
        </Pressable>

        {loading || !program ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Program status card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <AppText size={13} color={colors.mutedForeground}>
                  {program.memberPhone ? `${program.memberPhone} · ` : ""}
                  {program.gymName || "Any branch"}
                </AppText>
                <AppText
                  size={12}
                  weight="700"
                  color={
                    program.status === "ongoing"
                      ? colors.primary
                      : program.status === "completed"
                        ? colors.mutedForeground
                        : "#f5b840"
                  }
                >
                  {program.status.toUpperCase()}
                </AppText>
              </View>

              {program.status === "accepted" ? (
                <ActionButton
                  label="Start training"
                  busy={busy === "start"}
                  color={colors.primary}
                  onPress={() =>
                    act(
                      "start",
                      () => staffPtApi.start(program.id),
                      "The member's 2 free kick-starter sessions are unlocked.",
                    )
                  }
                />
              ) : (
                <>
                  <AppText weight="700" size={14}>
                    Free kick-starter sessions
                  </AppText>
                  {[1, 2].map((n) => {
                    const doneAt = n === 1 ? program.session1DoneAt : program.session2DoneAt;
                    return (
                      <View key={n} style={styles.rowBetween}>
                        <AppText size={14}>
                          Session {n}
                          {doneAt ? ` — done ${istDateLabel(doneAt)}` : ""}
                        </AppText>
                        {doneAt ? (
                          <Feather name="check-circle" size={18} color={colors.primary} />
                        ) : program.status === "ongoing" ? (
                          <ActionButton
                            small
                            label="Mark done"
                            busy={busy === `s${n}`}
                            color={colors.primary}
                            onPress={() =>
                              act(`s${n}`, () => staffPtApi.sessionDone(program.id, n as 1 | 2))
                            }
                          />
                        ) : null}
                      </View>
                    );
                  })}
                  {program.status === "ongoing" ? (
                    <ActionButton
                      label="Mark program completed"
                      busy={busy === "complete"}
                      color={colors.primary}
                      onPress={() =>
                        act(
                          "complete",
                          () => staffPtApi.complete(program.id),
                          "Program marked completed.",
                        )
                      }
                    />
                  ) : null}
                </>
              )}
            </View>

            {/* BMI records */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppText weight="700" size={15}>
                BMI records
              </AppText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  placeholder="Height (cm)"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                />
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  placeholder="Weight (kg)"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
              </View>
              <TextInput
                style={[...inputStyle, styles.multiline]}
                placeholder="Notes for the member (optional)"
                placeholderTextColor="#777"
                multiline
                value={bmiNote}
                onChangeText={setBmiNote}
              />
              <ActionButton
                label="Save BMI record"
                busy={busy === "bmi"}
                color={colors.primary}
                onPress={addBmi}
              />
              {bmi.map((r) => (
                <View key={r.id} style={[styles.subCard, { borderColor: colors.border }]}>
                  <AppText weight="700" size={14}>
                    BMI {r.bmi ?? "—"}{" "}
                    <AppText size={12} color={colors.mutedForeground}>
                      ({r.heightCm} cm · {r.weightKg} kg) · {istDateLabel(r.createdAt)}
                    </AppText>
                  </AppText>
                  {r.note ? (
                    <AppText size={13} color={colors.mutedForeground}>
                      {r.note}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Assigned exercises */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppText weight="700" size={15}>
                Assigned exercises
              </AppText>
              {exPicked ? (
                <View style={[styles.subCard, { borderColor: colors.border, borderTopWidth: 0 }]}>
                  <View style={styles.rowBetween}>
                    <AppText weight="700" size={14}>
                      {exPicked.name}{" "}
                      <AppText size={12} color={colors.mutedForeground}>
                        · {exPicked.muscle}
                      </AppText>
                    </AppText>
                    <Pressable onPress={() => setExPicked(null)} hitSlop={8}>
                      <Feather name="x" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <TextInput
                  style={inputStyle}
                  placeholder="Search exercise library (e.g. bench, squat)…"
                  placeholderTextColor="#777"
                  value={exSearch}
                  onChangeText={setExSearch}
                />
              )}
              {exMatches.map((e) => (
                <Pressable
                  key={e.slug}
                  onPress={() => setExPicked(e)}
                  style={[styles.subCard, { borderColor: colors.border }]}
                >
                  <AppText weight="700" size={14}>
                    {e.name}{" "}
                    <AppText size={12} color={colors.mutedForeground}>
                      · {e.muscle}
                    </AppText>
                  </AppText>
                </Pressable>
              ))}
              {exSearch.trim().length >= 2 && !exPicked && exMatches.length === 0 ? (
                <AppText size={12} color={colors.mutedForeground}>
                  No exercise matches "{exSearch.trim()}".
                </AppText>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  placeholder="Sets (e.g. 3)"
                  placeholderTextColor="#777"
                  value={exSets}
                  onChangeText={setExSets}
                />
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  placeholder="Reps (e.g. 10-12)"
                  placeholderTextColor="#777"
                  value={exReps}
                  onChangeText={setExReps}
                />
              </View>
              <TextInput
                style={[...inputStyle, styles.multiline]}
                placeholder="Coaching note for the member (optional)"
                placeholderTextColor="#777"
                multiline
                value={exNote}
                onChangeText={setExNote}
              />
              <ActionButton
                label="Assign exercise"
                busy={busy === "exercise"}
                color={colors.primary}
                onPress={addExercise}
              />
              {exercises.map((e) => (
                <View key={e.id} style={[styles.subCard, { borderColor: colors.border }]}>
                  <View style={styles.rowBetween}>
                    <AppText weight="700" size={14}>
                      {e.exerciseName}{" "}
                      <AppText size={12} color={colors.mutedForeground}>
                        · {istDateLabel(e.createdAt)}
                      </AppText>
                    </AppText>
                    <Pressable
                      onPress={() => removeExercise(e.id)}
                      disabled={busy !== null}
                      hitSlop={8}
                    >
                      {busy === `removeEx${e.id}` ? (
                        <ActivityIndicator size="small" color={colors.mutedForeground} />
                      ) : (
                        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                      )}
                    </Pressable>
                  </View>
                  {e.sets || e.reps ? (
                    <AppText size={13} color={colors.mutedForeground}>
                      {e.sets ? `${e.sets} sets` : ""}
                      {e.sets && e.reps ? " × " : ""}
                      {e.reps ? `${e.reps} reps` : ""}
                    </AppText>
                  ) : null}
                  {e.note ? (
                    <AppText size={13} color={colors.mutedForeground}>
                      {e.note}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Diet plans */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppText weight="700" size={15}>
                Diet plans
              </AppText>
              <TextInput
                style={inputStyle}
                placeholder="Title (e.g. Week 1 – Fat loss)"
                placeholderTextColor="#777"
                value={dietTitle}
                onChangeText={setDietTitle}
              />
              <TextInput
                style={[...inputStyle, styles.multiline]}
                placeholder="Write the diet plan…"
                placeholderTextColor="#777"
                multiline
                value={dietContent}
                onChangeText={setDietContent}
              />
              <ActionButton
                label="Save diet plan"
                busy={busy === "diet"}
                color={colors.primary}
                onPress={addDiet}
              />
              {diets.map((d) => (
                <View key={d.id} style={[styles.subCard, { borderColor: colors.border }]}>
                  <AppText weight="700" size={14}>
                    {d.title}{" "}
                    <AppText size={12} color={colors.mutedForeground}>
                      · {istDateLabel(d.createdAt)}
                    </AppText>
                  </AppText>
                  <AppText size={13} color={colors.mutedForeground}>
                    {d.content}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ActionButton({
  label,
  busy,
  color,
  onPress,
  small,
}: {
  label: string;
  busy: boolean;
  color: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        small ? styles.smallBtn : styles.actionBtn,
        { backgroundColor: color, opacity: pressed || busy ? 0.7 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#000" size="small" />
      ) : (
        <AppText weight="700" size={small ? 12 : 14} color="#000">
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  subCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtn: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
