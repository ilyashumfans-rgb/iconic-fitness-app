import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetTrainerBookingQueryKey,
  getListTrainerPackagesQueryKey,
  useCreateTrainerBooking,
  useGetMe,
  useGetTrainerBooking,
  useListTrainerPackages,
  type TrainerPackage,
} from "@workspace/api-client-react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { Chip, EmptyState, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateInNDays, istDateLabel, istToday } from "@/lib/dates";
import { submitLead } from "@/lib/leads";
import { openExternal } from "@/lib/links";

const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "07:00", label: "Morning" },
  { value: "13:00", label: "Afternoon" },
  { value: "19:00", label: "Evening" },
];

export default function BookTrainerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{
    trainerName?: string;
    trainerId?: string;
    gymId?: string;
    gymName?: string;
  }>();
  const coach = (params.trainerName ?? "").trim() || "a personal trainer";
  const gymId = Number(params.gymId);
  const hasGym = Number.isFinite(gymId) && gymId > 0;

  const packagesQuery = useListTrainerPackages(
    { gymId },
    {
      query: {
        enabled: hasGym,
        queryKey: getListTrainerPackagesQueryKey({ gymId }),
      },
    },
  );
  const packages = useMemo(
    () => packagesQuery.data ?? [],
    [packagesQuery.data],
  );
  // Paid checkout only works when the branch is connected to the gym-billing
  // system and has purchasable packages; otherwise fall back to an enquiry.
  const paidFlow = hasGym && packages.length > 0;

  const meQuery = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMeQueryKey(),
    },
  });

  const dateOptions = [istToday(), istDateInNDays(1), istDateInNDays(2)];

  const [pkgId, setPkgId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(dateOptions[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  useEffect(() => {
    const me = meQuery.data;
    if (!me) return;
    setName((prev) => (prev ? prev : (me.name ?? "")));
    setPhone((prev) => (prev ? prev : (me.mobile ?? "")));
  }, [meQuery.data]);

  const createBooking = useCreateTrainerBooking();
  const statusQuery = useGetTrainerBooking(bookingId ?? 0, {
    query: {
      enabled: bookingId !== null,
      queryKey: getGetTrainerBookingQueryKey(bookingId ?? 0),
      refetchInterval: (q) =>
        q.state.data?.status === "pending" ? 4000 : false,
    },
  });
  const status = bookingId !== null ? statusQuery.data?.status : undefined;
  const selectedPkg = packages.find((p) => p.id === pkgId) ?? null;

  // Paid checkout requires a signed-in member (payment is tied to the account).
  if (paidFlow && isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

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

  async function onPay() {
    if (!selectedPkg) {
      Alert.alert("Pick a package", "Please choose a package to continue.");
      return;
    }
    if (!validateContact()) return;
    setBusy(true);
    try {
      const created = await createBooking.mutateAsync({
        data: {
          gymId,
          packageId: selectedPkg.id,
          trainerId: params.trainerId ?? undefined,
          trainerName: (params.trainerName ?? "").trim() || undefined,
          name: name.trim(),
          mobile: phone.trim(),
          preferredDate: date,
        },
      });
      setBookingId(created.id);
      await openExternal(created.paymentUrl);
    } catch (err) {
      Alert.alert(
        "Could not start payment",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
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
        message: `Personal training session request with ${coach}${params.gymName ? ` at ${params.gymName}` : ""}.`,
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

  // ── Post-payment status screen ────────────────────────────────────────────
  if (bookingId !== null) {
    const paid = status === "paid";
    const failed = status === "failed";
    return (
      <Screen contentContainerStyle={{ paddingBottom: 40 }}>
        <ModalHeader title="Payment" />
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
            <Feather
              name={paid ? "check-circle" : failed ? "x-circle" : "clock"}
              size={44}
              color={paid ? colors.primary : failed ? "#ff6b6b" : colors.mutedForeground}
            />
            <AppText weight="700" size={18}>
              {paid
                ? "Payment successful"
                : failed
                  ? "Payment failed"
                  : "Waiting for payment…"}
            </AppText>
            <AppText muted size={14} style={{ textAlign: "center" }}>
              {paid
                ? `Your ${selectedPkg?.name ?? "PT"} package is booked${params.gymName ? ` at ${params.gymName}` : ""}. The team will reach out to schedule your sessions.`
                : failed
                  ? "The payment didn't go through. No money was taken — you can try again."
                  : "Complete the payment in the browser window, then come back here."}
            </AppText>
            {paid ? (
              <Button label="Done" onPress={() => router.back()} />
            ) : failed ? (
              <Button
                label="Try again"
                onPress={() => {
                  setBookingId(null);
                }}
              />
            ) : null}
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Book a session" />

      <Card>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          {paidFlow ? `Train with ${coach}` : `Request a session with ${coach}`}
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          {paidFlow
            ? "Pick a package and pay securely online — your booking is confirmed instantly."
            : "Share your details and preferred slot — the team will reach out to confirm."}
        </AppText>

        {hasGym && packagesQuery.isLoading ? <LoadingView /> : null}

        {paidFlow ? (
          <View style={{ gap: 10, marginBottom: 16 }}>
            <AppText weight="600" size={13}>
              Choose a package
            </AppText>
            {packages.map((p) => (
              <PackageOption
                key={p.id}
                pkg={p}
                selected={p.id === pkgId}
                onPress={() => setPkgId(p.id)}
              />
            ))}
          </View>
        ) : null}

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
        {!paidFlow ? (
          <>
            <View style={{ height: 12 }} />
            <Field
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        ) : null}

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          {paidFlow ? "Start date" : "Preferred day"}
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

        {!paidFlow ? (
          <>
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
          </>
        ) : null}

        <View style={{ marginTop: 20 }}>
          {paidFlow ? (
            <Button
              label={
                selectedPkg
                  ? `Pay ₹${selectedPkg.amountInr.toLocaleString("en-IN")}`
                  : "Pay online"
              }
              onPress={onPay}
              loading={busy}
              icon="credit-card"
            />
          ) : (
            <Button
              label="Send request"
              onPress={onEnquire}
              loading={busy}
              icon="send"
            />
          )}
        </View>
        {paidFlow ? (
          <AppText muted size={11} style={{ marginTop: 10, textAlign: "center" }}>
            Payments are processed securely by Razorpay via the gym's billing
            system.
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

function PackageOption({
  pkg,
  selected,
  onPress,
}: {
  pkg: TrainerPackage;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.elevated : "transparent",
          borderRadius: 14,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={14}>
            {pkg.serviceName} — {pkg.name}
          </AppText>
          <AppText muted size={12} style={{ marginTop: 2 }}>
            {pkg.duration}
          </AppText>
        </View>
        <AppText weight="700" size={15} color={selected ? colors.primary : undefined}>
          ₹{pkg.amountInr.toLocaleString("en-IN")}
        </AppText>
      </View>
    </Pressable>
  );
}
