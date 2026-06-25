import { View } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Polygon,
  Stop,
} from "react-native-svg";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

type Props = {
  /** 0..1 progress */
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerTop?: string;
  centerMain: string;
  centerBottom?: string;
};

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

export function HexProgress({
  progress,
  size = 180,
  strokeWidth = 12,
  centerTop,
  centerMain,
  centerBottom,
}: Props) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const points = hexPoints(cx, cy, r);
  // Regular hexagon: side length == circumradius, so perimeter = 6 * r
  const perimeter = 6 * r;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="hexGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.water} />
            <Stop offset="0.5" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.destructive} />
          </SvgLinearGradient>
        </Defs>
        <Polygon
          points={points}
          fill="none"
          stroke={colors.border}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <Polygon
          points={points}
          fill="none"
          stroke="url(#hexGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${perimeter * pct} ${perimeter}`}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {centerTop ? (
          <AppText muted size={11} weight="600">
            {centerTop}
          </AppText>
        ) : null}
        <AppText weight="700" size={40}>
          {centerMain}
        </AppText>
        {centerBottom ? (
          <AppText muted size={12}>
            {centerBottom}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
