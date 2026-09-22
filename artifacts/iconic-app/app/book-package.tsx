import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetMyMembershipQueryKey,
  getGetMyReferralInfoQueryKey,
  getGetPackageBookingQueryKey,
  getListMembershipPackagesQueryKey,
  useCreatePackageBooking,
  useGetMe,
  useGetMyReferralInfo,
  useGetPackageBooking,
  useListGyms,
  useListMembershipPackages,
  type Gym,
  type TrainerPackage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { Alert, Platform, Pressable, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { CouponInput, type AppliedCoupon } from "@/components/CouponInput";
import { ModalHeader } from "@/components/ModalHeader";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { CalendarPicker } from "@/components/DateTimePickers";
import { useColors } from "@/hooks/useColors";
import { istDateLabel, istToday } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { submitLead } from "@/lib/leads";
import { openPayment } from "@/lib/links";
import { memberAuthHref } from "@/lib/memberAuth";

export default function BookPackageScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ planName?: string; gymId?: string }>();
  const interestedIn = (params.planName ?? "").trim();
  // A branch page can deep-link here with its gymId preselected so the
  // member lands straight on that branch's price list.
  const paramGymId = Number(params.gymId);

  const gymsQuery = useListGyms({});
  // Branches with online purchase first so the paid path is front and center.
  const gyms = useMemo(() => {
    const list = [...(gymsQuery.data ?? [])];
    list.sort(
      (a, b) => Number(b.onlinePurchase ?? false) - Number(a.onlinePurchase ?? false),
    );
    return list;
  }, [gymsQuery.data]);
  const [gymId, setGymId] = useState<number | null>(
    Number.isInteger(paramGymId) && paramGymId > 0 ? paramGymId : null,
  );
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


  // Wallet points redemption (signed-in members only).
  const queryClient = useQueryClient();
  const referralQuery = useGetMyReferralInfo({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyReferralInfoQueryKey(),
    },
  });
  const pointsAvailable = referralQuery.data?.balanceInr ?? 0;
  const [usePoints, setUsePoints] = useState(false);

  const [pkgId, setPkgId] = useState<number | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [date, setDate] = useState(istToday());
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  // Keep the hosted checkout link so a blocked async popup can be opened
  // again from a direct button gesture without creating another booking.
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const submitGuardRef = useRef(false);
  const paymentOpenGuardRef = useRef(false);
  // Guest purchases poll status with the access token returned at creation.
  const [bookingToken, setBookingToken] = useState<string | null>(null);

  useEffect(() => {
    const me = meQuery.data;
    if (!me) return;
    setName((prev) => (prev ? prev : (me.name ?? "")));
    setPhone((prev) => (prev ? prev : (me.mobile ?? "")));
    setEmail((prev) => (prev ? prev : (me.email ?? "")));
  }, [meQuery.data]);

  const createBooking = useCreatePackageBooking();
  const pollParams = bookingToken ? { token: bookingToken } : undefined;
  const statusQuery = useGetPackageBooking(bookingId ?? 0, pollParams, {
    query: {
      enabled: bookingId !== null,
      queryKey: getGetPackageBookingQueryKey(bookingId ?? 0, pollParams),
      refetchInterval: (q) =>
        q.state.data?.status === "pending" ? 4000 : false,
    },
  });
  const status = bookingId !== null ? statusQuery.data?.status : undefined;
  const selectedPkg = packages.find((p) => p.id === pkgId) ?? null;

  useEffect(() => {
    // A blocked popup error is no longer actionable once the gateway reports
    // a terminal result; don't leave stale checkout errors above success.
    if (status === "paid" || status === "failed") {
      setCheckoutError(null);
    }
  }, [status]);

  // Coupon first, then points on the remainder — both leave at least ₹1
  // payable (the gateway needs a real charge). Server re-validates both.
  const couponDiscount = selectedPkg && coupon ? coupon.discountInr : 0;
  const afterCoupon = selectedPkg
    ? Math.max(1, selectedPkg.amountInr - couponDiscount)
    : 0;
  const pointsDiscount = selectedPkg
    ? Math.min(pointsAvailable, Math.max(0, afterCoupon - 1))
    : 0;
  const payableInr = selectedPkg
    ? afterCoupon - (usePoints ? pointsDiscount : 0)
    : 0;

  // A coupon is validated against one package's price — reset it if the
  // member switches packages.
  useEffect(() => {
    setCoupon(null);
  }, [pkgId]);

  // Auto-select the first package for the plan selection screen
  useEffect(() => {
    if (paidFlow && pkgId === null && packages.length > 0) {
      setPkgId(packages[0].id);
    }
  }, [paidFlow, pkgId, packages]);

  // Points are debited server-side when the payment lands; refresh the wallet
  // and the membership (the new plan should replace "Join membership" cues).
  useEffect(() => {
    if (status === "paid") {
      void queryClient.invalidateQueries({
        queryKey: getGetMyReferralInfoQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getGetMyMembershipQueryKey(),
      });
    }
  }, [status, queryClient]);

  function validateContact(): boolean {
    if (name.trim().length < 2) {
      setCheckoutError("Name required — please enter your full name.");
      if (paidFlow) setCheckoutStep(2);
      return false;
    }
    if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) {
      setCheckoutError("Phone required — please enter a valid phone number.");
      if (paidFlow) setCheckoutStep(2);
      return false;
    }
    return true;
  }

  function continueToDetails() {
    setCheckoutError(null);
    if (!selectedPkg) {
      setCheckoutError("Pick a package — please choose a package to continue.");
      return;
    }
    setCheckoutStep(2);
  }

  function continueToPayment() {
    setCheckoutError(null);
    if (!validateContact()) return;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCheckoutError("Check your email — please enter a valid email address.");
      setCheckoutStep(2);
      return;
    }
    setCheckoutStep(3);
  }

  async function onPay() {
    // React Native can deliver two presses before the busy state is rendered.
    // Guard synchronously so only one booking mutation can be created.
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setCheckoutError(null);
    try {
      if (gymId === null || !selectedPkg) {
        setCheckoutError("Pick a package — please choose a package to continue.");
        setCheckoutStep(1);
        return;
      }
      if (!validateContact()) return;
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setCheckoutError("Check your email — please enter a valid email address.");
        setCheckoutStep(2);
        return;
      }
      if (!termsAccepted) {
        setCheckoutError(
          "Terms & Conditions — please accept the terms before continuing with payment.",
        );
        return;
      }
      setBusy(true);
      const created = await createBooking.mutateAsync({
        data: {
          gymId,
          packageId: selectedPkg.id,
          name: name.trim(),
          mobile: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          startDate: date,
          ...(coupon ? { couponCode: coupon.code } : {}),
          ...(usePoints && pointsDiscount > 0
            ? { redeemPoints: pointsDiscount }
            : {}),
        },
      });
      setBookingId(created.id);
      setPaymentUrl(created.paymentUrl ?? null);
      setBookingToken(created.token ?? null);
      await openPayment(created.paymentUrl);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not start payment. Please try again.",
      );
    } finally {
      setBusy(false);
      submitGuardRef.current = false;
    }
  }

  async function onEnquire() {
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setCheckoutError(null);
    if (!validateContact()) {
      submitGuardRef.current = false;
      return;
    }
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
      setCheckoutError(
        err instanceof Error ? err.message : "Could not send your request. Please try again.",
      );
    } finally {
      setBusy(false);
      submitGuardRef.current = false;
    }
  }

  async function reopenPayment() {
    if (paymentOpenGuardRef.current) return;
    paymentOpenGuardRef.current = true;
    setCheckoutError(null);
    try {
      // An absent URL is intentionally passed through to the shared validator
      // so malformed API responses are visible instead of becoming a no-op.
      await openPayment(paymentUrl ?? "");
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Could not open the payment page. Please try again.",
      );
    } finally {
      paymentOpenGuardRef.current = false;
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
            {checkoutError ? <CheckoutError message={checkoutError} /> : null}
            {!paid && !failed && statusQuery.isError && !checkoutError ? (
              <CheckoutError message="We couldn't check the payment status just now. You can continue to the payment page or try checking again." />
            ) : null}
            {paid && isSignedIn && !meQuery.data?.avatarUrl ? (
              <View
                style={{
                  alignSelf: "stretch",
                  marginTop: 4,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 10,
                }}
              >
                <AppText weight="600" size={13} style={{ textAlign: "center" }}>
                  Add your profile photo
                </AppText>
                <AppText muted size={11} style={{ textAlign: "center" }}>
                  It goes on your member card — you can also add it later from
                  your Account.
                </AppText>
                <ProfilePhotoPicker
                  avatarUrl={meQuery.data?.avatarUrl}
                  name={name || meQuery.data?.name}
                  size={84}
                />
              </View>
            ) : null}
            {paid && !isSignedIn ? (
              <View
                style={{
                  alignSelf: "stretch",
                  marginTop: 4,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  gap: 6,
                }}
              >
                <AppText weight="600" size={13} style={{ textAlign: "center" }}>
                  One last step — log in
                </AppText>
                <AppText muted size={12} style={{ textAlign: "center" }}>
                  Log in with the same phone number ({phone.trim()}) to see
                  your membership, your branch
                  {selectedGym ? ` (${selectedGym.name})` : ""}, and what to do
                  next.
                </AppText>
              </View>
            ) : null}
            {paid ? (
              isSignedIn ? (
                <Button
                  label="Go to Home"
                  onPress={() => router.replace("/(tabs)")}
                />
              ) : (
                <Button
                  label="Log in to continue"
                  onPress={() =>
                    router.replace(
                      memberAuthHref(
                        `/book-package?planName=${encodeURIComponent(
                          interestedIn,
                        )}&gymId=${encodeURIComponent(
                          gymId !== null ? String(gymId) : (params.gymId ?? ""),
                        )}`,
                      ),
                    )
                  }
                />
              )
            ) : failed ? (
              <Button
                label="Try again"
                onPress={() => {
                  setBookingId(null);
                  setBookingToken(null);
                  setPaymentUrl(null);
                  setCheckoutError(null);
                }}
              />
            ) : (
              <View style={{ gap: 10, alignSelf: "stretch", marginTop: 4 }}>
                <Button
                  label="Continue to payment"
                  onPress={() => void reopenPayment()}
                  icon="external-link"
                />
                <Button
                  label="Check payment status"
                  onPress={() => void statusQuery.refetch()}
                  loading={statusQuery.isFetching}
                  icon="refresh-cw"
                />
                <Button
                  label="Cancel and go back"
                  variant="secondary"
                  onPress={() => {
                    setBookingId(null);
                    setBookingToken(null);
                    setPaymentUrl(null);
                    setCheckoutError(null);
                  }}
                />
              </View>
            )}
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
  if (paidFlow && checkoutStep === 1) {
    const isPremium = selectedPkg?.name?.toLowerCase().includes("premium") || selectedPkg?.serviceName?.toLowerCase().includes("premium");
    const headerTitle = isPremium ? "Premium Membership" : "Membership Plans";
    
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        
        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 52 : 16, paddingBottom: 16 }}>
            <Pressable 
              accessibilityRole="button"
              accessibilityLabel="Change branch"
              hitSlop={12}
              onPress={() => {
                setGymId(null);
                setPkgId(null);
                setCheckoutStep(1);
              }} 
              style={{ paddingRight: 16 }}
            >
              <Feather name="arrow-left" size={24} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={17} color="#FFF">
                {headerTitle}
              </AppText>
              <AppText weight="500" size={12} color="#AAA">
                {selectedGym?.name ?? "Branch"}
              </AppText>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, paddingTop: 20 }}>
            <ExpoImage
              source={require("@/assets/images/membership-premium-artwork.jpg")}
              style={{ width: "100%", aspectRatio: 764 / 913 }}
              contentFit="contain"
              accessibilityLabel="Iconic Premium membership promotional artwork"
            />
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>

              {/* Package Description as Bullet Points */}
              <View style={{ marginTop: 24, gap: 14 }}>
                {selectedPkg?.description ? (
                  selectedPkg.description.split('\n').filter(l => l.trim().length > 0).map((line, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Feather name="check-circle" size={18} color="#FFF" />
                      <AppText weight="600" size={14} color="#E0E0E0" style={{ flex: 1 }}>
                        {line.trim()}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Feather name="check-circle" size={18} color="#FFF" />
                    <AppText weight="600" size={14} color="#E0E0E0" style={{ flex: 1 }}>
                      {selectedPkg?.name || "Select a package below"}
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* Horizontal Packages */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 16 }}
            >
              {packages.map(p => {
                const isSelected = p.id === pkgId;
                const isFeatured = /\b15[\s-]*months?\b/i.test(`${p.name} ${p.duration ?? ""}`);
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${p.name}, ₹${p.amountInr.toLocaleString("en-IN")}`}
                    key={p.id}
                    onPress={() => setPkgId(p.id)}
                    style={{
                      width: 160,
                      backgroundColor: isFeatured ? "rgba(245, 213, 71, 0.10)" : isSelected ? "rgba(163, 230, 53, 0.08)" : "rgba(30, 30, 30, 0.7)",
                      borderWidth: 2,
                      borderColor: isFeatured ? "#F5D547" : isSelected ? "#A3E635" : "#333",
                      borderRadius: 16,
                      padding: 16,
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: 160,
                    }}
                  >
                    {isFeatured ? (
                      <View style={{ backgroundColor: "#F5D547", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 }}>
                        <AppText size={12} weight="700" color="#15130A">Featured</AppText>
                      </View>
                    ) : null}
                    <View style={{ alignItems: "center", width: "100%", flex: 1 }}>
                      {p.duration ? (
                        <AppText weight="600" size={14} color={isSelected ? "#FFF" : "#AAA"} style={{ textAlign: "center", marginBottom: 6 }}>
                          {p.duration}
                        </AppText>
                      ) : null}
                      <AppText weight="500" size={13} color={isSelected ? "#E0E0E0" : "#B5B5B5"} style={{ textAlign: "center", marginBottom: 12 }}>
                        {p.name}
                      </AppText>
                      
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <AppText weight="700" size={20} color="#FFF" style={{ textAlign: "center" }}>
                          ₹{p.amountInr.toLocaleString("en-IN")}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ 
                      width: 22, 
                      height: 22, 
                      borderRadius: 11, 
                      borderWidth: 2, 
                      borderColor: isSelected ? "#A3E635" : "#555",
                      alignItems: "center", 
                      justifyContent: "center",
                      marginTop: 12,
                      backgroundColor: isSelected ? "rgba(163,230,53,0.2)" : "transparent"
                    }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#A3E635" }} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
              <Pressable
                accessibilityRole="button"
                onPress={continueToDetails}
                style={{
                  backgroundColor: "#A3E635",
                  borderRadius: 999,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <AppText weight="700" size={16} color="#0A0A0A">
                  Continue with this plan
                </AppText>
                <Feather name="arrow-right" size={20} color="#0A0A0A" />
              </Pressable>
              
              <AppText weight="600" size={10} color="#888" style={{ textAlign: "center", marginTop: 16, letterSpacing: 1 }}>
                MORE BENEFITS. A STRONGER TOMORROW.
              </AppText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Buy a package" />

       <Pressable
         onPress={() => {
           setGymId(null);
           setPkgId(null);
           setCheckoutStep(1);
         }}
         style={{ marginBottom: 12 }}
       >
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
        {paidFlow && checkoutStep > 1 ? (
          <Pressable
            onPress={() =>
              setCheckoutStep((step) => (step === 3 ? 2 : 1))
            }
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginBottom: 12,
            }}
          >
            <Feather name="arrow-left" size={15} color={colors.primary} />
            <AppText weight="600" size={13} color={colors.primary}>
              Back
            </AppText>
          </Pressable>
        ) : null}

        <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
          {!paidFlow
            ? "Request a callback"
            : checkoutStep === 1
              ? "Choose your plan"
              : checkoutStep === 2
                ? "Your details"
                : "Complete your purchase"}
        </AppText>
        <AppText muted size={13} style={{ marginBottom: 16 }}>
          {!paidFlow
            ? "Online purchase isn't available for this branch yet. Share your details and the team will help you join."
            : checkoutStep === 1
              ? "Select the membership package that works for you."
              : checkoutStep === 2
                ? "Enter the contact details for your membership."
                : "Choose your start date, apply a coupon if you have one, and confirm the terms."}
        </AppText>
        {checkoutError ? <CheckoutError message={checkoutError} /> : null}

        {(!paidFlow || checkoutStep === 2) ? (
          <>
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
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
            {paidFlow ? (
              <>
                <View style={{ height: 12 }} />
                <Field
                  label="Email ID"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            ) : null}
          </>
        ) : null}

        {paidFlow && checkoutStep === 2 && isSignedIn ? (
          <View
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 10,
            }}
          >
            <AppText weight="600" size={13}>
              Your profile photo{meQuery.data?.avatarUrl ? " ✅" : " (optional)"}
            </AppText>
            <AppText muted size={11}>
              This photo goes on your member card and your account. You can also
              add it after payment.
            </AppText>
            <ProfilePhotoPicker
              avatarUrl={meQuery.data?.avatarUrl}
              name={name || meQuery.data?.name}
              size={84}
            />
          </View>
        ) : null}

        {paidFlow && checkoutStep === 2 ? (
          <View style={{ marginTop: 20 }}>
            <Button
              label="Next"
              onPress={continueToPayment}
              icon="arrow-right"
            />
          </View>
        ) : null}

        {(!paidFlow || checkoutStep === 3) ? (
          <>
            {paidFlow && selectedPkg ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}0D`,
                  marginBottom: 18,
                }}
              >
                <AppText weight="700" size={14}>
                  {selectedPkg.serviceName}
                </AppText>
                <AppText weight="700" size={16} color={colors.primary} style={{ marginTop: 4 }}>
                  ₹{selectedPkg.amountInr.toLocaleString("en-IN")}
                </AppText>
              </View>
            ) : null}

            <AppText weight="600" size={13} style={{ marginBottom: 8 }}>
              Start date
            </AppText>
            <CalendarPicker value={date} onChange={setDate} />
            <AppText muted size={11} style={{ marginTop: 6 }}>
              Selected: {istDateLabel(date)}
            </AppText>
          </>
        ) : null}

        {paidFlow && checkoutStep === 3 ? (
          <CouponInput
            amountInr={selectedPkg ? selectedPkg.amountInr : null}
            kind="package"
            mobile={phone}
            applied={coupon}
            onApplied={setCoupon}
          />
        ) : null}

        {paidFlow && checkoutStep === 3 && isSignedIn && pointsAvailable > 0 ? (
          <Pressable
            onPress={() => setUsePoints((v) => !v)}
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: usePoints ? colors.primary : colors.border,
              backgroundColor: usePoints ? `${colors.primary}14` : "transparent",
            }}
          >
            <Feather
              name={usePoints ? "check-square" : "square"}
              size={20}
              color={usePoints ? colors.primary : colors.mutedForeground}
            />
            <View style={{ flex: 1 }}>
              <AppText weight="600" size={13}>
                Use wallet points
              </AppText>
              <AppText muted size={11} style={{ marginTop: 2 }}>
                {selectedPkg
                  ? `₹${pointsDiscount.toLocaleString("en-IN")} of your ${pointsAvailable.toLocaleString("en-IN")} points will be applied.`
                  : `You have ${pointsAvailable.toLocaleString("en-IN")} points (₹${pointsAvailable.toLocaleString("en-IN")}).`}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {paidFlow && checkoutStep === 3 ? (
          <Pressable
            onPress={() => setTermsAccepted((v) => !v)}
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: termsAccepted ? colors.primary : colors.border,
              backgroundColor: termsAccepted
                ? `${colors.primary}14`
                : "transparent",
            }}
          >
            <Feather
              name={termsAccepted ? "check-square" : "square"}
              size={20}
              color={termsAccepted ? colors.primary : colors.mutedForeground}
            />
            <AppText size={13} style={{ flex: 1, lineHeight: 18 }}>
              I have read and agree to the{" "}
              <AppText
                size={13}
                weight="700"
                color={colors.primary}
                onPress={() => router.push("/terms")}
              >
                Terms & Conditions
              </AppText>
              {"."}
            </AppText>
          </Pressable>
        ) : null}

        {(!paidFlow || checkoutStep === 3) ? (
          <View style={{ marginTop: 20 }}>
          {paidFlow ? (
            <Button
              label={
                selectedPkg
                  ? `Pay ₹${payableInr.toLocaleString("en-IN")}`
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
        ) : null}
        {paidFlow && checkoutStep === 3 ? (
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

function CheckoutError({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="alert"
      style={{
        alignSelf: "stretch",
        marginBottom: 14,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ff6b6b",
        backgroundColor: colors.destructive + "18",
      }}
    >
      <AppText size={13} color="#ff6b6b">
        {message}
      </AppText>
    </View>
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
            {/* Full branch name must always be readable — wrap, never truncate. */}
            <AppText weight="700" size={15}>
              {gym.name}
            </AppText>
            {gym.area ? (
              <AppText muted size={12} style={{ marginTop: 2 }}>
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
          <ExpoImage
            source={{ uri: imageUrl }}
            style={{ width: 52, height: 52, borderRadius: 10 }}
            contentFit="cover"
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
