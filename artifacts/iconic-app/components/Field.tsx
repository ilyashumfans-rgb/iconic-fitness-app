import { forwardRef } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, hint, style, ...rest },
  ref,
) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText weight="600" size={13} muted>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            borderRadius: 16,
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            borderWidth: 1, // Slightly thicker border for premium input feel
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          },
          style,
        ]}
        {...rest}
      />
      {hint ? (
        <AppText size={11} muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
  },
});
