import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

type Bar = { label: string; value: number };

type Props = {
  data: Bar[];
  color?: string;
  height?: number;
  suffix?: string;
};

export function WeeklyBars({ data, color, height = 130, suffix }: Props) {
  const colors = useColors();
  const max = Math.max(1, ...data.map((d) => d.value));
  const barColor = color ?? colors.primary;

  return (
    <View style={[styles.wrap, { height }]}>
      {data.map((d, i) => {
        const ratio = d.value / max;
        return (
          <View key={i} style={styles.col}>
            <AppText size={10} weight="600" muted style={styles.value}>
              {d.value > 0 ? `${Math.round(d.value)}${suffix ?? ""}` : ""}
            </AppText>
            <View style={styles.track}>
              <View
                style={{
                  width: "100%",
                  height: `${Math.max(ratio * 100, d.value > 0 ? 6 : 2)}%`,
                  backgroundColor: d.value > 0 ? barColor : colors.elevated,
                  borderRadius: 8,
                }}
              />
            </View>
            <AppText size={11} muted>
              {d.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  col: { flex: 1, alignItems: "center", height: "100%" },
  track: {
    flex: 1,
    width: "70%",
    justifyContent: "flex-end",
    marginVertical: 6,
  },
  value: { height: 14 },
});
