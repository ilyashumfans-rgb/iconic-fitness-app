import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";
import { openExternal, websiteUrl } from "@/lib/links";
import {
  primarySsoVerificationField,
  supportedSsoRequirementFields,
} from "@/lib/ssoCompletion";

export type SsoRequirementValues = {
  firstName: string;
  lastName: string;
  username: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
  legalAccepted: boolean;
};

type Props = {
  missingFields: string[];
  unverifiedFields: string[];
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: SsoRequirementValues) => void;
  onSendVerification: (
    field: "email_address" | "phone_number",
  ) => Promise<boolean>;
  onVerify: (
    field: "email_address" | "phone_number",
    code: string,
  ) => void;
};

const emptyValues: SsoRequirementValues = {
  firstName: "",
  lastName: "",
  username: "",
  emailAddress: "",
  phoneNumber: "",
  password: "",
  legalAccepted: false,
};

export function SsoRequirementsPopup({
  missingFields,
  unverifiedFields,
  loading,
  error,
  onCancel,
  onSubmit,
  onSendVerification,
  onVerify,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(emptyValues);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const verificationField = primarySsoVerificationField(unverifiedFields);
  const unsupportedFields = missingFields.filter(
    (field) => !supportedSsoRequirementFields.has(field),
  );
  useEffect(() => {
    // A signup can require both email and mobile verification. Never reuse a
    // code/send state from the first field when Clerk advances to the second.
    setVerificationCode("");
    setVerificationSent(false);
  }, [verificationField]);
  const set = <K extends keyof SsoRequirementValues>(
    key: K,
    value: SsoRequirementValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const verificationLabel =
    verificationField === "phone_number" ? "mobile number" : "email address";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText weight="700" size={23} color={colors.foreground}>
                Finish your Google signup
              </AppText>
              <AppText size={13} color={colors.mutedForeground}>
                Google verified your identity. Clerk needs the details below to
                create your account.
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel Google signup"
              disabled={loading}
              hitSlop={10}
              onPress={onCancel}
              style={styles.close}
            >
              <Feather name="x" size={21} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {unsupportedFields.length ? (
              <AppText size={13} color={colors.destructive} style={styles.copy}>
                This login requires {unsupportedFields.join(", ")}, which cannot
                be collected here. Use email signup or contact Iconic Fitness
                support.
              </AppText>
            ) : verificationField ? (
              <View style={styles.form}>
              <AppText size={14} color={colors.foreground}>
                Verify your {verificationLabel} to finish creating this account.
              </AppText>
              {verificationSent ? (
                <Field
                  label="Verification code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Code you received"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  editable={!loading}
                />
              ) : null}
              {error ? (
                <AppText size={13} color={colors.destructive}>
                  {error}
                </AppText>
              ) : null}
              <Button
                label={
                  verificationSent
                    ? "Verify and continue"
                    : `Send ${verificationLabel} code`
                }
                loading={loading}
                disabled={loading || (verificationSent && !verificationCode.trim())}
                onPress={() => {
                  if (verificationSent) {
                    onVerify(verificationField, verificationCode.trim());
                  } else {
                    void onSendVerification(verificationField).then((sent) => {
                      if (sent) setVerificationSent(true);
                    });
                  }
                }}
                size="lg"
              />
              </View>
            ) : (
              <View style={styles.form}>
              {missingFields.includes("first_name") ? (
                <Field
                  label="First name"
                  value={values.firstName}
                  onChangeText={(value) => set("firstName", value)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("last_name") ? (
                <Field
                  label="Last name"
                  value={values.lastName}
                  onChangeText={(value) => set("lastName", value)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("username") ? (
                <Field
                  label="Username"
                  value={values.username}
                  onChangeText={(value) => set("username", value)}
                  autoCapitalize="none"
                  autoComplete="username-new"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("email_address") ? (
                <Field
                  label="Email address"
                  value={values.emailAddress}
                  onChangeText={(value) => set("emailAddress", value)}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("phone_number") ? (
                <Field
                  label="Mobile number"
                  value={values.phoneNumber}
                  onChangeText={(value) => set("phoneNumber", value)}
                  placeholder="Include country code, e.g. +919876543210"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("password") ? (
                <Field
                  label="Password"
                  value={values.password}
                  onChangeText={(value) => set("password", value)}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!loading}
                />
              ) : null}
              {missingFields.includes("legal_accepted") ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: values.legalAccepted }}
                  disabled={loading}
                  onPress={() => set("legalAccepted", !values.legalAccepted)}
                  style={styles.legal}
                >
                  <Feather
                    name={values.legalAccepted ? "check-square" : "square"}
                    size={21}
                    color={values.legalAccepted ? colors.primary : colors.mutedForeground}
                  />
                  <AppText size={13} color={colors.foreground} style={styles.legalCopy}>
                    I agree to the{" "}
                    <AppText
                      size={13}
                      weight="700"
                      color={colors.primary}
                      onPress={() => void openExternal(`${websiteUrl}/terms`)}
                    >
                      Terms of Service
                    </AppText>
                    .
                  </AppText>
                </Pressable>
              ) : null}
              {error ? (
                <AppText size={13} color={colors.destructive}>
                  {error}
                </AppText>
              ) : null}
              <Button
                label="Finish creating account"
                loading={loading}
                disabled={loading || unsupportedFields.length > 0}
                onPress={() => onSubmit(values)}
                size="lg"
              />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.74)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "90%",
    maxWidth: 520,
    paddingHorizontal: 22,
    paddingTop: 22,
    width: "100%",
  },
  header: { flexDirection: "row", gap: 12, marginBottom: 18 },
  headerCopy: { flex: 1, gap: 4 },
  close: { padding: 4 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 2 },
  copy: { marginBottom: 16 },
  form: { gap: 14 },
  legal: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  legalCopy: { flex: 1, lineHeight: 19 },
});