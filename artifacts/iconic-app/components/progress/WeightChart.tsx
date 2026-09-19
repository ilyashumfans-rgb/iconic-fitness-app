import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import Svg, { Line, Circle, Polyline, Text as SvgText, G } from "react-native-svg";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/Button";

type Point = { date: string; value: number };

type Props = {
  data: Point[];
  onLogWeight: () => void;
  period: "1M" | "3M" | "6M" | "1Y";
  setPeriod: (p: "1M" | "3M" | "6M" | "1Y") => void;
};

export function WeightChart({ data, onLogWeight, period, setPeriod }: Props) {
  const colors = useColors();
  const [tooltip, setTooltip] = useState<Point | null>(null);

  // Filter data based on period
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date();
    const months = period === "1M" ? 1 : period === "3M" ? 3 : period === "6M" ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    
    // Data is assumed to be sorted ascending by date
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.filter(d => new Date(d.date) >= cutoff);
  }, [data, period]);

  const isEmpty = filteredData.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText weight="700" size={18}>Weight Trend</AppText>
        <View style={styles.periodSelector}>
          {["1M", "3M", "6M", "1Y"].map((p) => {
            const isSelected = p === period;
            return (
              <Pressable key={p} onPress={() => setPeriod(p as any)} hitSlop={8} style={{marginLeft: 12}}>
                <AppText size={14} color={isSelected ? colors.text : colors.mutedForeground} weight={isSelected ? "600" : "400"}>
                  {p}
                </AppText>
              </Pressable>
            )
          })}
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <AppText muted style={{ marginBottom: 12 }}>No weight data for this period.</AppText>
          <Button label="Log Weight" onPress={onLogWeight} full={false} />
        </View>
      ) : (
        <ChartSvg data={filteredData} tooltip={tooltip} setTooltip={setTooltip} colors={colors} />
      )}
    </View>
  );
}

function ChartSvg({ data, tooltip, setTooltip, colors }: any) {
  const height = 180;
  const width = Dimensions.get("window").width - 64; // roughly 2 * 16 margin + paddings
  const chartHeight = height - 40;
  
  const minVal = Math.min(...data.map((d: any) => d.value));
  const maxVal = Math.max(...data.map((d: any) => d.value));
  const padding = (maxVal - minVal) * 0.1 || 1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  
  const points = data.map((d: any, i: number) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * (width - 40) + 30;
    const y = chartHeight - ((d.value - yMin) / (yMax - yMin)) * chartHeight;
    return { x, y, ...d };
  });
  
  const polylineStr = points.map((p: any) => `${p.x},${p.y}`).join(" ");

  const formatShortDate = (dStr: string) => {
    const d = new Date(dStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]}`;
  };

  const xLabels = points.map((p: any) => p.date);
  // Pick max 5 labels to display
  const labelIndices = [];
  if (data.length <= 5) {
    labelIndices.push(...data.map((_: any, i: number) => i));
  } else {
    for (let i = 0; i < 5; i++) {
      labelIndices.push(Math.floor(i * (data.length - 1) / 4));
    }
  }

  return (
    <View style={{ height }}>
      <Svg height={height} width={width}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight * ratio;
          const val = yMax - (ratio * (yMax - yMin));
          return (
            <G key={ratio}>
              <Line x1="30" y1={y} x2={width} y2={y} stroke={colors.border} strokeWidth="1" />
              <SvgText x="0" y={y + 4} fill={colors.mutedForeground} fontSize="10">
                {Math.round(val)}
              </SvgText>
            </G>
          );
        })}
        
        {/* Line */}
        <Polyline points={polylineStr} fill="none" stroke={colors.primary} strokeWidth="2" />
        
        {/* Points */}
        {points.map((p: any, i: number) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={colors.background}
            stroke={colors.primary}
            strokeWidth="2"
            onPress={() => setTooltip(p)}
          />
        ))}
        
        {/* Tooltip */}
        {tooltip && (
          <G>
            <Circle cx={points.find((p:any) => p.date === tooltip.date)?.x} cy={points.find((p:any) => p.date === tooltip.date)?.y} r="6" fill={colors.primary} />
            <SvgText
              x={points.find((p:any) => p.date === tooltip.date)?.x}
              y={(points.find((p:any) => p.date === tooltip.date)?.y || 20) - 15}
              fill={colors.text}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              {`${tooltip.value} kg`}
            </SvgText>
          </G>
        )}

        {/* X Axis Labels */}
        {labelIndices.map(i => {
          const p = points[i];
          return (
            <SvgText key={i} x={p.x} y={height - 5} fill={colors.mutedForeground} fontSize="10" textAnchor="middle">
              {formatShortDate(p.date)}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, padding: 16, backgroundColor: "transparent", borderRadius: 16, borderWidth: 1, borderColor: "#333" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  periodSelector: { flexDirection: "row", alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 32 },
});
