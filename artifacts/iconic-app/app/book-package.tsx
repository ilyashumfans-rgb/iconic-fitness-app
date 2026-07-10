import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetPackageBookingQueryKey,
  getListMembershipPackagesQueryKey,
  useCreatePackageBooking,
  useGetMe,
  useGetPackageBooking,
  useListGyms,
  useListMembershipPackages,
  type Gym,
  type TrainerPackage,
} from "@workspace/api-client-react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";

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
import { openExternal } from "@/lib/links";

export default function BookPackageScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ planName?: string }>();
  const interestedIn = (params.planName ?? "").trim();

  const gymsQuery = useListGyms({});
  // Branches with online purchase first so the paid path is front and center.
  const gyms = useMemo(() => {
    const list = [...(gymsQuery.data ?? [])];
    list.sort(
      (a, b) => Number(b.onlinePurchase ?? false) - Number(a.onlinePurchase ?? false),
    );
    return list;
  }, [gymsQuery.data]);
  const [gymId, setGymId] = useState<number | null>(null);
  const selectedGym = gyms.find((g) => g.id === gymId) ?? null;

  const pkgParams = gymId !== null ? { gymId } : { gymId: 0 };
  const packagesQuery = useListMembershipPackages(pkgParams, {
    query: {
      enabled: gymId !== null,
      queryKey: getListMembershipPackagesQueryKey(pkgParams),
    },
  });
  const packages = useMemo(
    () => packagesQuery.data ?? [],
    [packagesQuery.data],
  );
  // Explicit state gating (never show the enquiry fallback while the package
  // list is still loading or after a fetch error, or paying members get
  // misrouted away from checkout): loading → spinner; error → retry; success
  // with packages → paid checkout; success and confirmed empty → enquiry.
  const packagesSettled = gymId !== null && packagesQuery.isSuccess;
  const packagesFailed = gymId !== null && packagesQuery.isError;
  const paidFlow = packagesSettled && packages.length > 0;

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
  const [date, setDate] = useState(dateOptions[0]);
  const [busy, setBusy] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  useEffect(() => {
    const me = meQuery.data;
    if (!me) return;
    setName((prev) => (prev ? prev : (me.name ?? "")));
    setPhone((prev) => (prev ? prev : (me.mobile ?? "")));
  }, [meQuery.data]);

  const createBooking = useCreatePackageBooking();
  const statusQuery = useGetPackageBooking(bookingId ?? 0, {
    query: {
      enabled: bookingId !== null,
      queryKey: getGetPackageBookingQueryKey(bookingId ?? 0),
      refetchInterval: (q) =>
        q.state.data?.status === "pending" ? 4000 : false,
    },
  });
  const status = bookingId !== null ? statusQuery.data?.status : undefined;
  const selectedPkg = packages.find((p) => p.id === pkgId) ?? null;

  // Paid checkout requires a signed-in member (payment is tied to the account).
  if (isLoaded && !isSignedIn) {
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
    if (gymId === null || !selectedPkg) {
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
          name: name.trim(),
          mobile: phone.trim(),
          startDate: date,
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
        kind: "membership",
        name: name.trim(),
        phone: phone.trim(),
        preferredDate: date,
        preferredTime: "10:00",
        message: `Membership package purchase request${interestedIn ? ` — interested in "${interestedIn}"` : ""}${selectedGym ? ` at ${selectedGym.name}` : ""}.`,
        source: "iconic-app-book-package",
      });
      Alert.alert(
        "Request sent",
        "The team will be in touch to help you join.",
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
                ? `Your ${selectedPkg?.name ?? "membership"} package is active${selectedGym ? ` at ${selectedGym.name}` : ""}. Welcome aboard!`
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

  // ── Step 1: pick a branch ─────────────────────────────────────────────────
  if (gymId === null) {
    return (
      <Screen
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshing={gymsQuery.isRefetching}
        onRefresh={() => void gymsQuery.refetch()}
      >
        <ModalHeader title="Buy a package" />
        <AppText muted size={14} style={{ marginBottom: 16 }}>
          Pick your branch to see its plans and prices.
        </AppText>
        {gymsQuery.isLoading ? (
          <LoadingView />
        ) : gymsQuery.isError ? (
          <ErrorView onRetry={() => void gymsQuery.refetch()} />
        ) : gyms.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="No branches yet"
            message="Check back soon."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {gyms.map((g) => (
              <BranchRow key={g.id} gym={g} onPress={() => setGymId(g.id)} />
            ))}
          </View>
        )}
      </Screen>
    );
  }

  // ── Step 2: pick a package & pay ──────────────────────────────────────────
  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Buy a package" />

      <Pressable onPress={() => setGymId(null)} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <AppText weight="600" size={13} color={colors.primary}>
            {selectedGym?.name ?? "Branch"} — change
          </AppText>
        </View>
      </Pressable>

      {packagesFailed ? (
        <Card>
          <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
            Couldn't load plans
          </AppText>
          <AppText muted size={13} style={{ marginBottom: 16 }}>
            We couldn't fetch the plans for{" "}
            {selectedGym?.name ?? "this branch"} right now. Please check your
            connection and try again.
          </AppText>
          <Button
            label="Try again"
            onPress={() => packagesQuery.refetch()}
            loading={packagesQuery.isFetching}
            icon="refresh-cw"
          />
        </Card>
      ) : !packagesSettled ? (
        <Card>
          <LoadingView />
          <AppText muted size={13} style={{ textAlign: "center", marginTop: 8 }}>
            Loading plans for {selectedGym?.name ?? "this branch"}…
          </AppText>
        </Card>
      ) : (
      <Card>
        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          {paidFlow ? "Choose your plan" : "Request a callback"}
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          {paidFlow
            ? "Pick a plan and pay securely online — your membership starts instantly."
            : "Online purchase isn't available for this branch yet. Share your details and the team will help you join."}
        </AppText>

        {paidFlow ? (
          <View style={{ gap: 10, marginBottom: 16 }}>
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

        <AppText
          weight="600"
          size={13}
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Start date
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
      )}
    </Screen>
  );
}

function BranchRow({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.elevated,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="map-pin" size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={15} numberOfLines={1}>
              {gym.name}
            </AppText>
            {gym.area ? (
              <AppText muted size={12} numberOfLines={1} style={{ marginTop: 2 }}>
                {gym.area}
              </AppText>
            ) : null}
          </View>
          {gym.onlinePurchase ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: colors.elevated,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <AppText weight="700" size={10} color={colors.primary}>
                BUY ONLINE
              </AppText>
            </View>
          ) : null}
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </Card>
    </Pressable>
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
  const imageUrl = resolveImageUrl(pkg.imageUrl);
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
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 52, height: 52, borderRadius: 10 }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={14}>
            {pkg.serviceName} — {pkg.name}
          </AppText>
          {pkg.duration ? (
            <AppText muted size={12} style={{ marginTop: 2 }}>
              {pkg.duration}
            </AppText>
          ) : null}
          {pkg.description ? (
            <AppText muted size={12} style={{ marginTop: 4 }} numberOfLines={3}>
              {pkg.description}
            </AppText>
          ) : null}
        </View>
        <AppText weight="700" size={15} color={selected ? colors.primary : undefined}>
          ₹{pkg.amountInr.toLocaleString("en-IN")}
        </AppText>
      </View>
    </Pressable>
  );
}
