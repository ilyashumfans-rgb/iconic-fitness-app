import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

type Props = ScrollViewProps;

/**
 * ScrollView that keeps the focused text input visible above the keyboard.
 * On native, a KeyboardAvoidingView ("padding") shrinks the scroll area when
 * the keyboard opens so the focused field scrolls into view (required on
 * Android with edge-to-edge, where adjustResize no longer resizes the window).
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  const scrollView = (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </ScrollView>
  );
  if (Platform.OS === "web") return scrollView;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      {scrollView}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
