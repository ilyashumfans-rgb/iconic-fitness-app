import { useAuth } from "@clerk/expo";
import {
  getGetMeQueryKey,
  getListLiveTrainersQueryKey,
  useGetMe,
  useListLiveTrainers,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { CalendarPicker, TimePicker } from "@/components/DateTimePickers";
import { Chip } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateLabel, istToday } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { submitLead } from "@/lib/leads";

// PT sessions are request-only: no package picker or online payment here.
// Members send a session request (prefilled from their profile) and the
// team confirms offline. Paid package purchase lives on its own screen.
export default function BookTrainerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{
    trainerName?: string;
    trainerId?: string;
    trainerPhotoUrl?: string;
    gymId?: string;
    gymName?: string;
    trial?: string;
  }>();
  const isTrial = params.trial === "1";
  const coachName = (params.trainerName ?? "").trim();
  const coach = coachName || "a personal trainer";
  const gymId = Number(params.gymId);
  const hasGym = Number.isFinite(gymId) && gymId > 0;

  // When a specific trainer was picked, land on their profile first — the
  // request form stays hidden until "Book a PT Session" is tapped.
  const hasCoachProfile = !isTrial && coachName.length > 0;
  const [showForm, setShowForm] = useState(!hasCoachProfile);

  const meQuery = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMeQueryKey(),
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(istToday());
  const [time, setTime] = useState("07:00");
  const [preferredTrainer, setPreferredTrainer] = useState("");
  const [busy, setBusy] = useState(false);

  // Trial requests let the member optionally pick a preferred coach from the
  // branch's live roster. Staff still see and handle every request.
  const trialRosterParams = hasGym ? { gymId } : undefined;
  const trialRosterQuery = useListLiveTrainers(trialRosterParams, {
    query: {
      enabled: isTrial && hasGym,
      queryKey: getListLiveTrainersQueryKey(trialRosterParams),
    },
  });
  const trialRoster = trialRosterQuery.data ?? [];

  // Prefill contact details from the signed-in member's profile so they can
  // submit the request without retyping stored data.
  useEffect(() => {
    const me = meQuery.data;
    if (!me) return;
    setName((prev) => (prev ? prev : (me.name ?? "")));
    setPhone((prev) => (prev ? prev : (me.mobile ?? "")));
    setEmail((prev) => (prev ? prev : (me.email ?? "")));
  }, [meQuery.data]);

  function validateContact(): boolean {
    if (name.trim().length < 2) {
      Alert.alert("Name required", "Please enter your full name.");
      return false;
    }
    if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) {
      Alert.alert("Phone required", "Please enter a valid phone number.");
      return false;
    }
    return true;
  }

  async function onEnquire() {
    if (!validateContact()) return;
    setBusy(true);
    try {
      await submitLead({
        kind: "general",
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredDate: date,
        preferredTime: time,
        message: isTrial
          ? `Kick-starter PT trial session request${params.gymName ? ` at ${params.gymName}` : ""}.${
              preferredTrainer ? ` Preferred trainer: ${preferredTrainer}.` : ""
            }`
          : `Personal training session request with ${coach}${params.gymName ? ` at ${params.gymName}` : ""}.`,
        source: "iconic-app-live-trainer",
        // Branch + coach details so the request shows on the partner's
        // PT Bookings page (className carries the coach's name).
        gymId: hasGym ? gymId : undefined,
        gymName: params.gymName ?? "",
        // Trial requests have no chosen coach — staff assign one later.
        className: isTrial ? "Trial session" : coach,
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

  // Trainer profile view — details + photo only; the form opens on demand.
  if (hasCoachProfile && !showForm) {
    const photo = resolveImageUrl(params.trainerPhotoUrl || null);
    const initials = coachName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
    return (
      <Screen contentContainerStyle={{ paddingBottom: 40 }}>
        <ModalHeader title="Trainer" />
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: "100%", aspectRatio: 4 / 3 }}
            />
          ) : (
            <View
              style={{
                width: "100%",
                aspectRatio: 4 / 3,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.elevated,
              }}
            >
              <AppText weight="700" size={48} color={colors.primary}>
                {initials || "PT"}
              </AppText>
            </View>
          )}
          <View style={{ padding: 18, gap: 4 }}>
            <AppText weight="700" size={20}>
              {coachName}
            </AppText>
            <AppText muted size={14}>
              Personal Trainer
              {params.gymName ? ` · ${params.gymName}` : ""}
            </AppText>
            <AppText muted size={13} style={{ marginTop: 8 }}>
              One-on-one coaching tailored to your goals — strength, fat loss,
              mobility, or general fitness. Send a request and the team will
              set up your session.
            </AppText>
            <View style={{ marginTop: 16 }}>
              <Button
                label="Book a PT Session"
                onPress={() => setShowForm(true)}
                icon="calendar"
              />
            </View>
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title={isTrial ? "Book your trial session" : "Book a PT session"} />

      <Card>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          {isTrial
            ? "Request your kick-starter trial session"
            : `Request a session with ${coach}`}
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

        {isTrial && trialRoster.length > 0 ? (
          <>
            <AppText
              weight="600"
              size={13}
              style={{ marginTop: 18, marginBottom: 8 }}
            >
              Preferred trainer (optional)
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip
                label="Any trainer"
                active={preferredTrainer === ""}
                onPress={() => setPreferredTrainer("")}
              />
              {trialRoster.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  active={preferredTrainer === t.name}
                  onPress={() => setPreferredTrainer(t.name)}
                />
              ))}
            </View>
          </>
        ) : null}

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Preferred date — {istDateLabel(date)}
        </AppText>
        <CalendarPicker value={date} onChange={setDate} />

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Preferred time
        </AppText>
        <TimePicker value={time} onChange={setTime} />

        <View style={{ marginTop: 20 }}>
          <Button
            label="Send request"
            onPress={onEnquire}
            loading={busy}
            icon="send"
          />
        </View>
      </Card>
    </Screen>
  );
}
