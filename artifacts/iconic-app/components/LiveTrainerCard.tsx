import { type LiveTrainer } from "@workspace/api-client-react";
import { Image, Pressable, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

export function LiveTrainerCard({ trainer, onPress }: {
  trainer: LiveTrainer;
  onPress: () => void;
}) {
  const colors = useColors();
  const photo = resolveImageUrl(trainer.photoUrl ?? null);
  const initials = trainer.name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]!.toUpperCase()).join("");
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${trainer.name}'s profile`}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: "100%", aspectRatio: 4 / 3 }} />
        ) : (
          <View style={{ width: "100%", aspectRatio: 4 / 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated }}>
            <AppText weight="700" size={48} color={colors.primary}>{initials || "PT"}</AppText>
          </View>
        )}
        <View style={{ padding: 16, gap: 2 }}>
          <AppText weight="700" size={17}>{trainer.name}</AppText>
          <AppText muted size={13}>Personal Trainer</AppText>
        </View>
      </Card>
    </Pressable>
  );
}