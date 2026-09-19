import { useAuth } from "@clerk/expo";
import {
  getGetFitnessSetupQueryKey,
  getGetMeQueryKey,
  type FitnessSetupStepSave,
  useCompleteFitnessSetup,
  useGetFitnessSetup,
  useGetMe,
  useSaveFitnessSetupStep,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Chip, ChipRow, Segmented } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { memberAuthHref } from "@/lib/memberAuth";

const GOALS = ["Feel fitter", "Build strength", "Lose fat", "Build muscle", "Move better"];
const INTERESTS = ["Strength", "Walking", "Yoga", "Group classes", "Mobility", "Cardio"];
const DAYS = [
  ["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"],
  ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"],
] as const;
const EQUIPMENT = ["No equipment", "Dumbbells", "Resistance bands", "Machines", "Barbell"];

function toggle(items: string[], item: string) {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}

function errorMessage(err: unknown) {
  return (
    (err as { data?: { error?: string } })?.data?.error ??
    (err as { body?: { error?: string } })?.body?.error ??
    "Please check your details and try again."
  );
}

export default function FitnessSetupScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isGuest } = useGuest();
  const queryClient = useQueryClient();
  const member = isLoaded && !!isSignedIn && !isGuest && !!userId;
  const queryKey = [...getGetFitnessSetupQueryKey(), userId ?? "anonymous"];
  const setupQuery = useGetFitnessSetup({
    query: { enabled: member, queryKey },
  });
  const existingProfileQuery = useGetMe({
    query: {
      enabled: member && setupQuery.data?.exists === false,
      queryKey: [...getGetMeQueryKey(), userId ?? "anonymous"],
    },
  });
  const save = useSaveFitnessSetupStep();
  const complete = useCompleteFitnessSetup();

  const [step, setStep] = useState(1);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState("not_sure");
  const [activityLevel, setActivityLevel] = useState("not_sure");
  const [ability, setAbility] = useState("not_sure");
  const [limitations, setLimitations] = useState("");
  const [routineDays, setRoutineDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("flexible");
  const [location, setLocation] = useState("not_sure");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [diet, setDiet] = useState("not_sure");
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);
  const [prefilledFromAssessment, setPrefilledFromAssessment] = useState(false);

  useEffect(() => {
    const data = setupQuery.data;
    if (!data || ready) return;
    const metric = data.unitSystem !== "imperial";
    setUnitSystem(metric ? "metric" : "imperial");
    if (data.heightCm != null) {
      setHeight(String(Math.round((metric ? data.heightCm : data.heightCm / 2.54) * 10) / 10));
    }
    if (data.weightKg != null) {
      setWeight(String(Math.round((metric ? data.weightKg : data.weightKg * 2.20462) * 10) / 10));
    }
    setAge(data.age != null ? String(data.age) : "");
    setGoals(data.goals ?? []);
    setInterests(data.interests ?? []);
    setExperienceLevel(data.experienceLevel ?? "not_sure");
    setActivityLevel(data.activityLevel ?? "not_sure");
    setAbility(data.selfReportedAbility ?? "not_sure");
    setLimitations(data.movementLimitations ?? "");
    setRoutineDays(data.routineDays ?? []);
    setPreferredTime(data.preferredTime ?? "flexible");
    setLocation(data.workoutLocation ?? "not_sure");
    setEquipment(data.equipment ?? []);
    setDiet(data.dietPreference ?? "not_sure");
    setStep(params.edit === "1" ? 1 : data.currentStep);
    setReady(true);
  }, [params.edit, ready, setupQuery.data]);

  useEffect(() => {
    const profile = existingProfileQuery.data;
    // Do not turn legacy placeholder values into facts. The only legacy values
    // copied into this separate editable profile are from a completed
    // assessment and must pass basic plausible bounds.
    if (
      setupQuery.data?.exists ||
      !profile?.assessmentComplete ||
      prefilledFromAssessment ||
      profile.age == null ||
      profile.heightCm == null ||
      profile.weightKg == null ||
      !(profile.age >= 13 && profile.heightCm >= 80 && profile.weightKg >= 20)
    ) return;
    setAge(String(profile.age));
    setHeight(String(profile.heightCm));
    setWeight(String(profile.weightKg));
    setPrefilledFromAssessment(true);
  }, [
    existingProfileQuery.data,
    prefilledFromAssessment,
    setupQuery.data?.exists,
  ]);

  if (!isLoaded) return null;
  if (!member) return <Redirect href={memberAuthHref("/fitness-setup")} />;
  if (setupQuery.isPending || !ready) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.center}>
        <AppText muted>Loading your private setup…</AppText>
      </Screen>
    );
  }
  if (setupQuery.isError) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.center}>
        <AppText weight="700">Couldn&apos;t load your setup</AppText>
        <Button label="Try again" onPress={() => void setupQuery.refetch()} full={false} />
      </Screen>
    );
  }

  const metricHeight = Number(height);
  const metricWeight = Number(weight);
  const bodySave: FitnessSetupStepSave = {
    step: 1,
    unitSystem,
    height: height.trim() ? metricHeight : null,
    weight: weight.trim() ? metricWeight : null,
    age: age.trim() ? Number(age) : null,
  };

  const dataForStep = (): FitnessSetupStepSave => {
    if (step === 1) return bodySave;
    if (step === 2) return { step: 2, goals, interests };
    if (step === 3) {
      return {
        step: 3,
        experienceLevel: experienceLevel as FitnessSetupStepSave["experienceLevel"],
        activityLevel: activityLevel as FitnessSetupStepSave["activityLevel"],
        selfReportedAbility: ability as FitnessSetupStepSave["selfReportedAbility"],
        movementLimitations: limitations.trim() || null,
      };
    }
    return {
      step: 4,
      routineDays: routineDays as FitnessSetupStepSave["routineDays"],
      preferredTime: preferredTime as FitnessSetupStepSave["preferredTime"],
      workoutLocation: location as FitnessSetupStepSave["workoutLocation"],
      equipment,
      dietPreference: diet as FitnessSetupStepSave["dietPreference"],
    };
  };

  const saveStep = async (next: "forward" | "back" | "complete") => {
    try {
      await save.mutateAsync({ data: dataForStep() });
      await queryClient.invalidateQueries({ queryKey });
      if (next === "back") {
        setStep((current) => Math.max(1, current - 1));
      } else if (next === "forward") {
        setStep((current) => Math.min(4, current + 1));
      } else {
        await complete.mutateAsync();
        await queryClient.invalidateQueries({ queryKey });
        setFinished(true);
      }
    } catch (err) {
      Alert.alert("Couldn’t save", errorMessage(err));
    }
  };

  const skipOptional = async () => {
    const skipped: FitnessSetupStepSave =
      step === 2
        ? { step: 2, goals: [], interests: [] }
        : step === 3
          ? { step: 3, experienceLevel: "not_sure", activityLevel: "not_sure", selfReportedAbility: "not_sure", movementLimitations: null }
          : { step: 4, routineDays: [], preferredTime: "not_sure", workoutLocation: "not_sure", equipment: [], dietPreference: "not_sure" };
    try {
      await save.mutateAsync({ data: skipped });
      await queryClient.invalidateQueries({ queryKey });
      setStep((current) => Math.min(4, current + 1));
    } catch (err) {
      Alert.alert("Couldn’t save", errorMessage(err));
    }
  };

  if ((setupQuery.data.completed && params.edit !== "1") || finished) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.center}>
        <AppText weight="700" size={26} style={styles.title}>Your starting profile is ready</AppText>
        <AppText muted style={styles.centerCopy}>
          We&apos;ll use your private self-reported preferences to tailor suggestions. This is not a medical or fitness assessment.
        </AppText>
        <Button label="Go to Home" onPress={() => router.replace("/(tabs)")} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppText muted size={13}>YOUR PRIVATE STARTING PROFILE · {step} OF 4</AppText>
      <AppText weight="700" size={28} style={styles.title}>
        {step === 1 ? "Body basics" : step === 2 ? "What matters to you?" : step === 3 ? "Your starting point" : "Build a routine that fits"}
      </AppText>
      <AppText muted style={styles.subtitle}>
        {step === 1
          ? "A few basics help us keep suggestions relevant. Choose the units you prefer."
          : step === 2
            ? "Choose any that fit. Not sure is completely okay."
            : step === 3
              ? "This is self-reported and optional — not a medical fitness assessment."
              : "Everything here is optional. You can update it later in Fitness Profile."}
      </AppText>
      <Card style={styles.card}>
        {step === 1 ? (
          <View style={styles.gap}>
            <Segmented options={[{ value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }]} value={unitSystem} onChange={(value) => {
              if (value !== unitSystem && height) setHeight(String(Math.round((value === "metric" ? Number(height) * 2.54 : Number(height) / 2.54) * 10) / 10));
              if (value !== unitSystem && weight) setWeight(String(Math.round((value === "metric" ? Number(weight) / 2.20462 : Number(weight) * 2.20462) * 10) / 10));
              setUnitSystem(value);
            }} />
            <Field label={`Height (${unitSystem === "metric" ? "cm" : "in"})`} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder={unitSystem === "metric" ? "e.g. 170" : "e.g. 67"} />
            <Field label={`Weight (${unitSystem === "metric" ? "kg" : "lb"})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={unitSystem === "metric" ? "e.g. 65" : "e.g. 143"} />
            <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Years" />
            {prefilledFromAssessment ? <AppText muted size={12}>These values came from your completed profile. Change anything that is no longer current.</AppText> : null}
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.gap}>
            <AppText weight="600">Goals</AppText><ChipRow>{GOALS.map((x) => <Chip key={x} label={x} active={goals.includes(x)} onPress={() => setGoals(toggle(goals, x))} />)}</ChipRow>
            <AppText weight="600">Interests</AppText><ChipRow>{INTERESTS.map((x) => <Chip key={x} label={x} active={interests.includes(x)} onPress={() => setInterests(toggle(interests, x))} />)}</ChipRow>
          </View>
        ) : null}
        {step === 3 ? (
          <View style={styles.gap}>
            <AppText weight="600">Experience</AppText><Segmented options={[{ value: "new", label: "New" }, { value: "returning", label: "Returning" }, { value: "experienced", label: "Experienced" }, { value: "not_sure", label: "Not sure" }]} value={experienceLevel} onChange={setExperienceLevel} />
            <AppText weight="600">Current activity</AppText><Segmented options={[{ value: "low", label: "Low" }, { value: "light", label: "Light" }, { value: "moderate", label: "Moderate" }, { value: "high", label: "High" }, { value: "not_sure", label: "Not sure" }]} value={activityLevel} onChange={setActivityLevel} />
            <AppText weight="600">How does movement feel?</AppText><Segmented options={[{ value: "beginner", label: "Beginning" }, { value: "building", label: "Building" }, { value: "confident", label: "Confident" }, { value: "not_sure", label: "Not sure" }]} value={ability} onChange={setAbility} />
            <Field label="Anything you want us to consider? (optional)" hint="For example: “I prefer lower-impact movement.” Please don’t enter diagnoses or medical details." value={limitations} onChangeText={setLimitations} multiline />
          </View>
        ) : null}
        {step === 4 ? (
          <View style={styles.gap}>
            <AppText weight="600">Days that usually work</AppText><ChipRow>{DAYS.map(([value, label]) => <Chip key={value} label={label} active={routineDays.includes(value)} onPress={() => setRoutineDays(toggle(routineDays, value))} />)}</ChipRow>
            <AppText weight="600">Best time</AppText><Segmented options={[{ value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }, { value: "evening", label: "Evening" }, { value: "flexible", label: "Flexible" }, { value: "not_sure", label: "Not sure" }]} value={preferredTime} onChange={setPreferredTime} />
            <AppText weight="600">Where do you move?</AppText><Segmented options={[{ value: "gym", label: "Gym" }, { value: "home", label: "Home" }, { value: "both", label: "Both" }, { value: "not_sure", label: "Not sure" }]} value={location} onChange={setLocation} />
            <AppText weight="600">Equipment you have</AppText><ChipRow>{EQUIPMENT.map((x) => <Chip key={x} label={x} active={equipment.includes(x)} onPress={() => setEquipment(toggle(equipment, x))} />)}</ChipRow>
            <AppText weight="600">Diet preference</AppText><Segmented options={[{ value: "vegetarian", label: "Vegetarian" }, { value: "non_vegetarian", label: "Non-veg" }, { value: "vegan", label: "Vegan" }, { value: "no_preference", label: "No preference" }, { value: "not_sure", label: "Not sure" }]} value={diet} onChange={setDiet} />
          </View>
        ) : null}
      </Card>
      <View style={styles.actions}>
        {step > 1 ? <Button label="Back" variant="secondary" onPress={() => void saveStep("back")} /> : null}
        {step > 1 ? <Button label="Skip optional details" variant="ghost" onPress={() => void skipOptional()} /> : null}
        <Button label={step === 4 ? "Finish setup" : "Save and continue"} loading={save.isPending || complete.isPending} onPress={() => void saveStep(step === 4 ? "complete" : "forward")} />
      </View>
      <AppText muted size={12} style={styles.privacy}>Private to you in the app. We don&apos;t share this with staff or trainers automatically.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 24 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  centerCopy: { marginTop: 10, textAlign: "center" },
  title: { letterSpacing: -0.8, marginTop: 2 },
  subtitle: { lineHeight: 21 },
  card: { padding: 16 },
  gap: { gap: 14 },
  actions: { gap: 10, marginTop: 4 },
  privacy: { lineHeight: 17, marginTop: 2, textAlign: "center" },
});