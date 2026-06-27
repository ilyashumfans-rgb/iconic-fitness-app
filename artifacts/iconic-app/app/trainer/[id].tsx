import { Feather } from "@expo/vector-icons";
import { useGetTrainer } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { Chip, EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateInNDays, istDateLabel, istToday } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { submitLead } from "@/lib/leads";

const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "07:00", label: "Morning" },
  { value: "13:00", label: "Afternoon" },
  { value: "19:00", label: "Evening" },
];

export default function TrainerDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trainerId = Number(id);
  const query = useGetTrainer(trainerId);
  const trainer = query.data;

  const dateOptions = [istToday(), istDateInNDays(1), istDateInNDays(2)];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(dateOptions[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!trainer) return;
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
        message: `Personal training session request with ${trainer.name} (${trainer.specialty}).`,
        source: "iconic-app-trainer",
      });
      Alert.alert(
        "Request sent",
        `${trainer.name} will be in touch about your session.`,
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

  if (query.isLoading) {
    return (
      <Screen>
        <ModalHeader title="Trainer" />
        <LoadingView />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ModalHeader title="Trainer" />
        <ErrorView onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  if (!trainer) {
    return (
      <Screen>
        <ModalHeader title="Trainer" />
        <EmptyState icon="user-x" title="Trainer not found" />
      </Screen>
    );
  }

  const photo = resolveImageUrl(trainer.photoUrl);

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title={trainer.name} />

      <Card>
        <View style={{ flexDirection: "row", gap: 16 }}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: 84, height: 84, borderRadius: 18 }}
            />
          ) : (
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.elevated,
              }}
            >
              <Feather name="user" size={34} color={colors.mutedForeground} />
            </View>
          )}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <AppText weight="700" size={20}>
              {trainer.name}
            </AppText>
            <AppText muted size={14} style={{ marginTop: 2 }}>
              {trainer.specialty}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="star" size={14} color={colors.primary} />
                <AppText size={14} weight="600">
                  {trainer.rating.toFixed(1)}
                </AppText>
              </View>
              <AppText muted size={13}>
                {trainer.sessionsCount} sessions
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <AppText muted size={13}>
            Price per session
          </AppText>
          <AppText weight="700" size={18} style={{ color: colors.primary }}>
            ₹{trainer.pricePerSession}
          </AppText>
        </View>
      </Card>

      {trainer.bio ? (
        <Card style={{ marginTop: 12 }}>
          <AppText weight="700" size={15} style={{ marginBottom: 6 }}>
            About
          </AppText>
          <AppText muted size={14} style={{ lineHeight: 21 }}>
            {trainer.bio}
          </AppText>
        </Card>
      ) : null}

      {trainer.certifications.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
            Certifications
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {trainer.certifications.map((c) => (
              <View
                key={c}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: colors.elevated,
                }}
              >
                <Feather name="award" size={13} color={colors.primary} />
                <AppText size={13}>{c}</AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: 12 }}>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          Request a session
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          Share your details and preferred slot — the trainer will reach out to
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
