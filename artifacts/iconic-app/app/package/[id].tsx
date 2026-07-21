import { Feather } from "@expo/vector-icons";
import {
  useListMemberships,
  getListMembershipsQueryKey,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { Chip, EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateInNDays, istToday } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { submitLead } from "@/lib/leads";

const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "07:00", label: "Morning" },
  { value: "13:00", label: "Afternoon" },
  { value: "19:00", label: "Evening" },
];

export default function PackageDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);

  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const plan = useMemo(
    () =>
      (query.data ?? []).find(
        (p) => p.id === planId && p.billingPeriod === "annual",
      ),
    [query.data, planId],
  );

  const dateOptions = [istToday(), istDateInNDays(1), istDateInNDays(2)];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(dateOptions[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!plan) return;
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
        kind: "membership",
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredDate: date,
        preferredTime: time,
        message: `Enquiry about the "${plan.name}" annual package (₹${plan.priceInr.toLocaleString(
          "en-IN",
        )} / year).`,
        source: "iconic-app-package",
      });
      Alert.alert(
        "Enquiry sent",
        "Our team will reach out to you shortly about this package.",
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
        <ModalHeader title="Package" />
        <LoadingView />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ModalHeader title="Package" />
        <ErrorView onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <ModalHeader title="Package" />
        <EmptyState
          icon="package"
          title="Package not found"
          message="This package is no longer available."
        />
      </Screen>
    );
  }

  const uri = resolveImageUrl(plan.imageUrl);
  const hasDiscount = plan.originalPriceInr > plan.priceInr;

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title={plan.name} />

      <View style={styles.hero}>
        {uri ? (
          <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primary + "33", colors.card]}
            style={styles.heroImage}
          >
            <Feather name="package" size={44} color={colors.primary} />
          </LinearGradient>
        )}
        {plan.badge || plan.popular ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <AppText weight="700" size={12} style={{ color: colors.background }}>
              {plan.badge || "Popular"}
            </AppText>
          </View>
        ) : null}
      </View>

      <Card style={{ marginTop: 14 }}>
        <AppText weight="700" size={22}>
          {plan.name}
        </AppText>
        {plan.tagline ? (
          <AppText muted size={14} style={{ marginTop: 4, lineHeight: 20 }}>
            {plan.tagline}
          </AppText>
        ) : null}

        <View style={styles.priceRow}>
          <AppText weight="700" size={26} style={{ color: colors.primary }}>
            ₹{plan.priceInr.toLocaleString("en-IN")}
          </AppText>
          <AppText muted size={14} style={{ marginLeft: 4 }}>
            / year
          </AppText>
          {hasDiscount ? (
            <AppText
              muted
              size={14}
              style={{
                marginLeft: 10,
                textDecorationLine: "line-through",
              }}
            >
              ₹{plan.originalPriceInr.toLocaleString("en-IN")}
            </AppText>
          ) : null}
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Feather name="map-pin" size={16} color={colors.primary} />
            <AppText size={14} weight="600">
              {plan.gymsIncluded} {plan.gymsIncluded === 1 ? "gym" : "gyms"}
            </AppText>
          </View>
          <View style={styles.stat}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <AppText size={14} weight="600">
              {plan.classesPerMonth} classes / month
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          Buy online
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 14 }}>
          Pick your branch, pay securely and start training right away.
        </AppText>
        <Button
          label="Buy this package"
          icon="credit-card"
          onPress={() =>
            router.push({
              pathname: "/book-package",
              params: { planName: plan.name },
            })
          }
        />
      </Card>

      {plan.perks.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <AppText weight="700" size={15} style={{ marginBottom: 12 }}>
            What's included
          </AppText>
          <View style={{ gap: 12 }}>
            {plan.perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <Feather name="check-circle" size={17} color={colors.primary} />
                <AppText size={14} style={{ flex: 1, lineHeight: 20 }}>
                  {perk}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: 12 }}>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          Enquire about this package
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          Share your details and a preferred callback time — our team will reach
          out to help you get started.
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
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 98765 43210"
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
          muted
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          Preferred day
        </AppText>
        <View style={styles.chips}>
          {dateOptions.map((d, i) => (
            <Chip
              key={d}
              label={i === 0 ? "Today" : i === 1 ? "Tomorrow" : "In 2 days"}
              active={date === d}
              onPress={() => setDate(d)}
            />
          ))}
        </View>

        <AppText
          weight="600"
          size={13}
          muted
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          Preferred time
        </AppText>
        <View style={styles.chips}>
          {TIME_OPTIONS.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              active={time === t.value}
              onPress={() => setTime(t.value)}
            />
          ))}
        </View>

        <View style={{ height: 20 }} />
        <Button label="Send enquiry" onPress={onSubmit} loading={busy} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 340,
    borderRadius: 22,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
  },
  statRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
