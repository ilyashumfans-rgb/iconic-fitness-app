import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { Chip } from "@/components/ui-bits";
import { istDateInNDays, istDateLabel, istToday } from "@/lib/dates";
import { submitLead } from "@/lib/leads";

const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "07:00", label: "Morning" },
  { value: "13:00", label: "Afternoon" },
  { value: "19:00", label: "Evening" },
];

export default function BookTrainerScreen() {
  const router = useRouter();
  const { trainerName } = useLocalSearchParams<{ trainerName?: string }>();
  const coach = (trainerName ?? "").trim() || "a personal trainer";

  const dateOptions = [istToday(), istDateInNDays(1), istDateInNDays(2)];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(dateOptions[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (name.trim().length < 2) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }
    if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) {
      Alert.alert("Phone required", "Please enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      await submitLead({
        kind: "general",
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredDate: date,
        preferredTime: time,
        message: `Personal training session request with ${coach}.`,
        source: "iconic-app-live-trainer",
      });
      Alert.alert(
        "Request sent",
        "The team will be in touch to confirm your session.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        "Could not send",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Book a session" />

      <Card>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          Request a session with {coach}
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          Share your details and preferred slot — the team will reach out to
          confirm.
        </AppText>

        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <View style={{ height: 12 }} />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Your phone number"
          keyboardType="phone-pad"
        />
        <View style={{ height: 12 }} />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Preferred day
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {dateOptions.map((d) => (
            <Chip
              key={d}
              label={istDateLabel(d)}
              active={d === date}
              onPress={() => setDate(d)}
            />
          ))}
        </View>

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Preferred time
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TIME_OPTIONS.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              active={t.value === time}
              onPress={() => setTime(t.value)}
            />
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Button
            label="Send request"
            onPress={onSubmit}
            loading={busy}
            icon="send"
          />
        </View>
      </Card>
    </Screen>
  );
}
