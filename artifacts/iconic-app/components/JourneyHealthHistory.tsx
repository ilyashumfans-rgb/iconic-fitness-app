import { useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";

const fields = {
  conditions: "Medical conditions",
  injuries: "Injuries",
  medications: "Medications",
  allergies: "Allergies",
  exerciseRestrictions: "Exercise restrictions",
};
export type HealthHistoryAnswers = Record<keyof typeof fields, string> & { notes: string; consent: true };

export function JourneyHealthHistory({ onSubmit, busy }: { onSubmit: (data: HealthHistoryAnswers) => Promise<void>; busy: boolean }) {
  const colors = useColors();
  const [answers, setAnswers] = useState({ conditions: "", injuries: "", medications: "", allergies: "", exerciseRestrictions: "", notes: "" });
  const [consent, setConsent] = useState(false);
  return <View style={{ gap: 12 }}>
    <AppText weight="700" size={18}>Your health history</AppText>
    <AppText size={13}>Answer every health field. Enter “none” where nothing applies. Your club will review this separately; this form is not an assessment.</AppText>
    {Object.entries({ ...fields, notes: "Additional notes (optional)" }).map(([key, title]) => <View key={key} style={{ gap: 6 }}>
      <AppText size={14}>{title}</AppText>
      <TextInput accessibilityLabel={title} multiline editable={!busy} value={answers[key as keyof typeof answers]} maxLength={10000}
        onChangeText={value => setAnswers(a => ({ ...a, [key]: value }))}
        placeholder={key === "notes" ? "Anything else your club should know" : "Details, or none"}
        placeholderTextColor={colors.mutedForeground}
        style={{ minHeight: 58, borderWidth: 1, borderColor: colors.border, color: colors.foreground, borderRadius: 12, padding: 12, textAlignVertical: "top" }} />
    </View>)}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Switch accessibilityLabel="Consent to share health history with my club" value={consent} onValueChange={setConsent} disabled={busy} />
      <AppText size={13} style={{ flex: 1 }}>I confirm these answers and consent to sharing this health history with my club for my fitness journey.</AppText>
    </View>
    <Button label="Submit health history" loading={busy} disabled={!consent || Object.keys(fields).some(key => !answers[key as keyof typeof answers].trim())}
      onPress={() => void onSubmit({ ...answers, consent: true })} />
  </View>;
}