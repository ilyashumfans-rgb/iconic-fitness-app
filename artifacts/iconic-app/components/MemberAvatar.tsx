import { Image, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

/**
 * Member photo for staff-facing rosters (visual check-in verification).
 * Shows the member's uploaded profile photo when available and falls back
 * to their initials in a tinted circle otherwise.
 */
export function MemberAvatar({
  name,
  avatarUrl,
  size = 40,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
}) {
  const colors = useColors();
  const uri = resolveImageUrl(avatarUrl);
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.muted,
        }}
        accessibilityLabel={name ? `${name}'s photo` : "Member photo"}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "rgba(11,230,7,0.14)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText weight="700" size={size * 0.36} color={colors.primary}>
        {initials}
      </AppText>
    </View>
  );
}
