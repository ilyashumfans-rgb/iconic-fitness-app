import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetMyMembershipQueryKey,
  getListLiveTrainersQueryKey,
  getGetMyPtProgramQueryKey,
  getGetMyReferralInfoQueryKey,
  useGetMyMembership,
  useListLiveTrainers,
  useGetMyPtProgram,
  useGetMyReferralInfo,
  getGetTrainerBookingQueryKey,
  getListTrainerPackagesQueryKey,
  useCreateTrainerBooking,
  useGetMe,
  useGetTrainerBooking,
  useListTrainerPackages,
  type TrainerPackage,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { CouponInput, type AppliedCoupon } from "@/components/CouponInput";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { CalendarPicker } from "@/components/DateTimePickers";
import { useColors } from "@/hooks/useColors";
import { istDateLabel, istToday } from "@/lib/dates";
import { openPayment } from "@/lib/links";
import { memberAuthHref } from "@/lib/memberAuth";
import { LiveTrainerCard } from "@/components/LiveTrainerCard";

// Paid PT session packages for the member's branch: live prices from the
// gym-management system, hosted Razorpay checkout, and a booking row that
// lands on the partner's PT Bookings page with the selected live trainer.
export default function BookPtSessionsScreen({ afterTrial = false }: { afterTrial?: boolean }) {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ gymId?: string; gymName?: string; trainerId?: string }>();
  const queryClient = useQueryClient();
  const membershipQuery = useGetMyMembership({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMyMembershipQueryKey() },
  });
  // URL branch/name values are never authority for a paid member purchase.
  const gymId = isSignedIn && membershipQuery.data?.status === "active" ? membershipQuery.data.homeGymId ?? 0 : 0;
  const hasGym = gymId > 0;
  const gymName = membershipQuery.data?.branchName ?? "";
  const [trainerChoice, setTrainerChoice] = useState<{ gymId: number; id: string } | null>(null);
  const consumedTrainerLink = useRef<string | null>(null);
  const liveParams = { gymId };
  const rosterQuery = useListLiveTrainers(liveParams, {
    query: { enabled: hasGym, queryKey: getListLiveTrainersQueryKey(liveParams) },
  });
  const selectedTrainer = trainerChoice?.gymId === gymId && rosterQuery.isSuccess
    ? rosterQuery.data?.find((t) => t.id === trainerChoice.id) ?? null : null;
  useEffect(() => {
    if (!params.trainerId) {
      consumedTrainerLink.current = null;
      return;
    }
    if (!rosterQuery.isSuccess) return;
    const linkKey = `${gymId}:${params.trainerId}`;
    if (consumedTrainerLink.current === linkKey) return;
    const trainer = rosterQuery.data?.find((t) => t.id === params.trainerId);
    if (trainer) {
      consumedTrainerLink.current = linkKey;
      setTrainerChoice({ gymId, id: trainer.id });
    }
  }, [rosterQuery.isSuccess, rosterQuery.data, params.trainerId, gymId]);
  const programQuery = useGetMyPtProgram({
    query: { enabled: afterTrial && !!isSignedIn, queryKey: getGetMyPtProgramQueryKey() },
  });
  const referralQuery = useGetMyReferralInfo({
    query: { enabled: afterTrial && !!isSignedIn, queryKey: getGetMyReferralInfoQueryKey() },
  });
  const [usePoints, setUsePoints] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const pkgParams = hasGym ? { gymId } : { gymId: 0 };
  const packagesQuery = useListTrainerPackages(pkgParams, {
    query: {
      enabled: hasGym && !!selectedTrainer,
      queryKey: getListTrainerPackagesQueryKey(pkgParams),
    },
  });
  // Personal-training packages only — this screen isn't for gym memberships.
  // The billing system's PT flag is authoritative, but branches often name
  // PT packages without setting the flag, so also match by name.
  const packages = useMemo(
    () =>
      (packagesQuery.data ?? []).filter(
        (p) =>
          p.pt ||
          /(\bpt\b|personal\s*train)/i.test(`${p.serviceName} ${p.name}`),
      ),
    [packagesQuery.data],
  );
  // Explicit tri-state gating so members never see the wrong branch of the
  // flow while the price list is still loading (see book-package.tsx).
  const settled = hasGym && packagesQuery.isSuccess;
  const failed = hasGym && packagesQuery.isError;
  const paidFlow = settled && packages.length > 0;

  const meQuery = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMeQueryKey(),
    },
  });

  const [pkgId, setPkgId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(istToday());
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  // Keep the hosted checkout link so the member can re-open it if they
  // closed the payment window before finishing.
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
  const pointsDiscount = usePoints ? Math.min(referralQuery.data?.balanceInr ?? 0, Math.max(0, (selectedPkg?.amountInr ?? 0) - 1)) : 0;

  // Coupon leaves at least ₹1 payable; the server re-validates at checkout.
  const payableInr = selectedPkg
    ? Math.max(1, selectedPkg.amountInr - (coupon?.discountInr ?? 0) - pointsDiscount)
    : 0;

  // A coupon is validated against one package's price — reset it if the
  // member switches packages.
  useEffect(() => {
    setCoupon(null);
    setTermsAccepted(false);
  }, [pkgId]);
  useEffect(() => {
    setPkgId(null);
    setCoupon(null);
    setUsePoints(false);
    setTermsAccepted(false);
  }, [gymId, selectedTrainer?.id]);
  useEffect(() => {
    if (status === "paid") {
      void queryClient.invalidateQueries({ queryKey: getGetMyPtProgramQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetMyReferralInfoQueryKey() });
    }
  }, [status, queryClient]);

  function validateContact(): boolean {
    if (name.trim().length < 2) {
      setPaymentError("Please enter your full name.");
      Alert.alert("Name required", "Please enter your full name.");
      return false;
    }
    if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) {
      setPaymentError("Please enter a valid phone number.");
      Alert.alert("Phone required", "Please enter a valid phone number.");
      return false;
    }
    return true;
  }

  async function onPay() {
    setPaymentError(null);
    if (!hasGym || !selectedTrainer || !selectedPkg || !isSignedIn) {
      Alert.alert("Pick a package", "Please choose a PT package to continue.");
      return;
    }
    if (!termsAccepted) {
      setPaymentError("Please accept the Terms & Conditions before payment.");
      return;
    }
    if (!validateContact()) return;
    setBusy(true);
    try {
      const created = await createBooking.mutateAsync({
        data: {
          gymId,
          trainerId: selectedTrainer.id,
          trainerName: selectedTrainer.name,
          packageId: selectedPkg.id,
          name: name.trim(),
          mobile: phone.trim(),
          preferredDate: date,
          ...(coupon ? { couponCode: coupon.code } : {}),
          ...(pointsDiscount > 0 ? { redeemPoints: pointsDiscount } : {}),
        },
      });
      setBookingId(created.id);
      setPaymentUrl(created.paymentUrl ?? null);
      await openPayment(created.paymentUrl);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Could not start payment. Please try again.",
      );
      Alert.alert(
        "Could not start payment",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // ── Post-payment status ───────────────────────────────────────────────────
  if (bookingId !== null) {
    const paid = status === "paid";
    const failedPay = status === "failed";
    return (
      <Screen contentContainerStyle={{ paddingBottom: 40 }}>
        <ModalHeader title="Payment" />
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
            <Feather
              name={paid ? "check-circle" : failedPay ? "x-circle" : "clock"}
              size={44}
              color={
                paid
                  ? colors.primary
                  : failedPay
                    ? "#ff6b6b"
                    : colors.mutedForeground
              }
            />
            <AppText weight="700" size={18}>
              {paid
                ? "Payment successful"
                : failedPay
                  ? "Payment failed"
                  : "Waiting for payment…"}
            </AppText>
            <AppText muted size={14} style={{ textAlign: "center" }}>
              {paid
                ? `Your ${selectedPkg?.name ?? "PT"} package with ${selectedTrainer?.name ?? "your selected trainer"} is booked${gymName ? ` at ${gymName}` : ""}. Your invoice will appear under Invoices.`
                : failedPay
                  ? "Payment was not confirmed. If you were charged, contact the front desk before trying again."
                  : "Complete the payment in the browser window, then come back here."}
            </AppText>
            {paymentError ? (
              <AppText
                size={13}
                color="#ff6b6b"
                style={{ textAlign: "center", marginTop: 4 }}
              >
                {paymentError}
              </AppText>
            ) : null}
            {paid ? (
              <View style={{ gap: 10, alignSelf: "stretch" }}>
                <Button
                  label="View invoices"
                  onPress={() => router.replace("/invoices")}
                  icon="file-text"
                />
                <Button label="Done" onPress={() => router.back()} />
              </View>
            ) : failedPay ? (
              <Button
                label="Try again"
                onPress={() => {
                  setBookingId(null);
                  setPaymentUrl(null);
                  setPaymentError(null);
                }}
              />
            ) : (
              // Still pending (or the status check itself is failing) — give
              // the member ways out instead of an indefinite spinner.
              <View style={{ gap: 10, alignSelf: "stretch", marginTop: 4 }}>
                {statusQuery.isError ? (
                  <AppText muted size={12} style={{ textAlign: "center" }}>
                    We couldn't check the payment status just now.
                  </AppText>
                ) : null}
                <Button
                  label="Check payment status"
                  onPress={() => void statusQuery.refetch()}
                  loading={statusQuery.isFetching}
                  icon="refresh-cw"
                />
                {paymentUrl ? (
                  <Button
                    label="Re-open payment page"
                    onPress={() => {
                      setPaymentError(null);
                      void openPayment(paymentUrl).catch((err) => {
                        setPaymentError(
                          err instanceof Error
                            ? err.message
                            : "Could not open the payment page. Please try again.",
                        );
                      });
                    }}
                    icon="external-link"
                  />
                ) : null}
                <Button
                  label="Leave payment pending"
                  onPress={() => router.back()}
                />
              </View>
            )}
          </View>
        </Card>
      </Screen>
    );
  }
  if (!isLoaded || (isSignedIn && membershipQuery.isLoading)) {
    return <Screen><ModalHeader title="Book your PT sessions" /><LoadingView /></Screen>;
  }
  if (!isSignedIn) {
    return <Screen><ModalHeader title="Book your PT sessions" /><Card>
      <AppText weight="700">Sign in to book PT sessions</AppText>
      <AppText muted>Your active membership determines your branch and available coaches.</AppText>
      <Button label="Sign in" onPress={() => router.push(memberAuthHref(
        `${afterTrial ? "/book-pt-plan" : "/book-pt-sessions"}${params.trainerId ? `?trainerId=${encodeURIComponent(params.trainerId)}` : ""}`,
      ))} />
    </Card></Screen>;
  }
  if (membershipQuery.isError) {
    return <Screen><ModalHeader title="Book your PT sessions" /><ErrorView onRetry={() => void membershipQuery.refetch()} /></Screen>;
  }
  if (!hasGym) {
    return <Screen><ModalHeader title="Book your PT sessions" /><EmptyState icon="users" title="Active membership required" message="Please contact your branch's front desk to activate your membership or enquire about personal training. Online PT payment is available only to active members with a home branch." /><Button label="Find your branch" onPress={() => router.push("/trainers")} /></Screen>;
  }
  if (afterTrial && !programQuery.isSuccess) {
    return <Screen><ModalHeader title="Book your PT plan" />{programQuery.isError ? <ErrorView onRetry={() => void programQuery.refetch()} /> : <LoadingView />}</Screen>;
  }
  if (afterTrial && !programQuery.data?.kickstarterCompleted && !programQuery.data?.hasPaidPlan) {
    return <Screen><ModalHeader title="Book your PT plan" /><EmptyState icon="clock" title="Finish your Kick Start trial" message="Your completed trial sessions must be recorded before continuing from this page. Contact your trainer if they are missing." /><Button label="PT details" onPress={() => router.replace("/pt-details")} /></Screen>;
  }
  // Trainer profiles precede every package loading/error/empty state.
  if (!selectedTrainer) {
    return <Screen contentContainerStyle={{ paddingBottom: 40 }} refreshing={rosterQuery.isRefetching} onRefresh={() => void rosterQuery.refetch()}>
      <ModalHeader title="Choose your trainer" fallbackHref="/trainers" />
      <AppText weight="600" color={colors.primary} style={{ marginBottom: 12 }}>{gymName || "Your home branch"}</AppText>
      <AppText muted style={{ marginBottom: 16 }}>Choose a coach first, then view the branch's published PT packages.</AppText>
      {rosterQuery.isError ? <ErrorView onRetry={() => void rosterQuery.refetch()} /> : !rosterQuery.isSuccess ? <LoadingView /> : !rosterQuery.data?.length ? <>
        <EmptyState icon="users" title="No coaches listed" message="Your branch has not published its trainer roster. Ask the front desk to configure it before booking online." />
        <Button label="Refresh trainers" onPress={() => void rosterQuery.refetch()} />
      </> : <View style={{ gap: 14 }}>{rosterQuery.data.map((trainer) => (
        <LiveTrainerCard
          key={trainer.id}
          trainer={trainer}
          onPress={() => router.push({
            pathname: "/live-trainer/[id]",
            params: {
              id: trainer.id,
              gymId: String(gymId),
              ...(afterTrial ? { afterTrial: "1" } : {}),
            },
          })}
        />
      ))}</View>}
    </Screen>;
  }

  return (
    <Screen
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshing={packagesQuery.isRefetching}
      onRefresh={() => void packagesQuery.refetch()}
    >
      <ModalHeader title="Book your PT sessions" />
      <Card>
        <AppText weight="700">{selectedTrainer.name}</AppText>
        <AppText muted>{gymName || "Your home branch"}</AppText>
        <Button label="Change trainer" onPress={() => setTrainerChoice(null)} />
      </Card>

      {gymName ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <Feather name="map-pin" size={14} color={colors.primary} />
          <AppText weight="600" size={13} color={colors.primary}>
            {gymName}
          </AppText>
        </View>
      ) : null}

      {!hasGym ? (
        <EmptyState
          icon="map-pin"
          title="Pick a branch first"
          message="Open Personal Trainers and choose your branch to see PT prices."
        />
      ) : failed ? (
        <ErrorView onRetry={() => void packagesQuery.refetch()} />
      ) : !settled ? (
        <Card>
          <LoadingView />
          <AppText muted size={13} style={{ textAlign: "center", marginTop: 8 }}>
            Loading PT prices for {gymName || "your branch"}…
          </AppText>
        </Card>
      ) : !paidFlow ? (
        <Card>
          <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
            Online PT booking isn't available here yet
          </AppText>
          <AppText muted size={13} style={{ marginBottom: 16 }}>
            {gymName || "This branch"} hasn't published PT packages for online
            purchase. Send a session request instead and the team will help
            you.
          </AppText>
          <Button
            label="Request a PT session"
            icon="send"
            onPress={() =>
              // Plain PT session enquiry — NOT the free trial flow, so the
              // team sees it as a paid-PT interest request.
              router.replace({
                pathname: "/book-trainer",
                params: {
                  gymId: String(gymId),
                  gymName,
                  trainerId: selectedTrainer.id,
                  trainerName: selectedTrainer.name,
                },
              })
            }
          />
        </Card>
      ) : isLoaded && !isSignedIn ? (
        // Paid PT bookings are account-bound server-side — send guests to
        // log in first instead of letting the payment call fail.
        <Card>
          <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
            Log in to book PT sessions
          </AppText>
          <AppText muted size={13} style={{ marginBottom: 16 }}>
            PT bookings are linked to your account so your invoice and trainer
            assignment show up in the app. Please log in to continue.
          </AppText>
          <Button
            label="Log in"
            icon="log-in"
            onPress={() =>
              router.push(
                memberAuthHref(
                  `/book-pt-sessions?gymId=${encodeURIComponent(
                    String(params.gymId ?? ""),
                  )}&gymName=${encodeURIComponent(gymName)}`,
                ),
              )
            }
          />
        </Card>
      ) : (
        <Card>
          <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
            Choose your PT package
          </AppText>
          <AppText muted size={13} style={{ marginBottom: 16 }}>
            Pay securely online for sessions with {selectedTrainer.name}.
          </AppText>
          {paymentError ? (
            <AppText
              size={13}
              color="#ff6b6b"
              style={{ marginBottom: 14 }}
            >
              {paymentError}
            </AppText>
          ) : null}

          <View style={{ gap: 10, marginBottom: 16 }}>
            {packages.map((p) => (
              <PtPackageOption
                key={p.id}
                pkg={p}
                selected={p.id === pkgId}
                onPress={() => setPkgId(p.id)}
              />
            ))}
          </View>

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
          <CalendarPicker value={date} onChange={setDate} />
          <AppText muted size={11} style={{ marginTop: 6 }}>
            Selected: {istDateLabel(date)}
          </AppText>

          <CouponInput
            amountInr={selectedPkg ? selectedPkg.amountInr : null}
            kind="pt"
            mobile={phone}
            applied={coupon}
            onApplied={(value) => { setCoupon(value); if (value) setUsePoints(false); }}
          />
          {afterTrial && (referralQuery.data?.balanceInr ?? 0) > 0 ? (
            <Button label={`${usePoints ? "✓ " : ""}Redeem wallet points (${referralQuery.data?.balanceInr ?? 0} available)`} onPress={() => { setUsePoints((value) => !value); setCoupon(null); }} />
          ) : null}
          {selectedPkg ? <View style={{ gap: 6, marginTop: 16 }}>
            <AppText weight="700">Payment summary</AppText>
            <AppText>{selectedTrainer.name} · {gymName || "Your home branch"}</AppText>
            <AppText>{selectedPkg.name} · ₹{selectedPkg.amountInr.toLocaleString("en-IN")}</AppText>
            {coupon ? <AppText muted>Coupon: −₹{coupon.discountInr.toLocaleString("en-IN")}</AppText> : null}
            {pointsDiscount > 0 ? <AppText muted>Wallet: −₹{pointsDiscount.toLocaleString("en-IN")}</AppText> : null}
            <AppText weight="700">Total ₹{payableInr.toLocaleString("en-IN")}</AppText>
          </View> : null}
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted((value) => !value)} style={{ flexDirection: "row", gap: 10, paddingVertical: 16 }}>
            <Feather name={termsAccepted ? "check-square" : "square"} size={20} color={colors.primary} />
            <AppText>I accept the Terms & Conditions</AppText>
          </Pressable>
          <Button label="Read Terms & Conditions" onPress={() => router.push("/terms")} />

          <View style={{ marginTop: 20 }}>
            <Button
              label={
                selectedPkg
                  ? `Pay ₹${payableInr.toLocaleString("en-IN")}`
                  : "Pay online"
              }
              onPress={onPay}
              loading={busy}
              disabled={!selectedPkg || !termsAccepted}
              icon="credit-card"
            />
          </View>
          <AppText muted size={11} style={{ marginTop: 10, textAlign: "center" }}>
            Payments are processed securely by Razorpay via the gym's billing
            system.
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

function PtPackageOption({
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
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? `${colors.primary}14` : "transparent",
        }}
      >
        <Feather
          name={selected ? "check-circle" : "circle"}
          size={20}
          color={selected ? colors.primary : colors.mutedForeground}
        />
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>
            {pkg.name}
          </AppText>
          <AppText muted size={12} style={{ marginTop: 2 }}>
            {[
              pkg.sessions ? `${pkg.sessions} sessions` : null,
              pkg.duration || null,
            ]
              .filter(Boolean)
              .join(" · ") || pkg.serviceName}
          </AppText>
          {pkg.description ? (
            <AppText muted size={12} style={{ marginTop: 2 }}>
              {pkg.description}
            </AppText>
          ) : null}
        </View>
        <AppText weight="700" size={16} color={colors.primary}>
          ₹{pkg.amountInr.toLocaleString("en-IN")}
        </AppText>
      </View>
    </Pressable>
  );
}
