import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { istToday } from "@/lib/dates";

// All calendar math works on plain YYYY-MM-DD strings anchored at midday UTC
// so the rendered month/day grid is identical on every device timezone (IST
// is the product's canonical timezone).
function anchor(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month = last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Full month-grid calendar. Past dates (before IST today) are disabled.
 * Value in/out is a YYYY-MM-DD string.
 */
export function CalendarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (dateStr: string) => void;
}) {
  const colors = useColors();
  const today = istToday();
  const [todayYear, todayMonth] = today.split("-").map(Number);

  const selected = anchor(value);
  const [viewYear, setViewYear] = useState(selected.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getUTCMonth() + 1);

  const atCurrentMonth =
    viewYear === todayYear && viewMonth === todayMonth;

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    // Never navigate before the current IST month.
    if (y < todayYear || (y === todayYear && m < todayMonth)) return;
    setViewYear(y);
    setViewMonth(m);
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(anchor(ymd(viewYear, viewMonth, 1)));

  const firstWeekday = anchor(ymd(viewYear, viewMonth, 1)).getUTCDay();
  const total = daysInMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View
      style={[
        styles.calendar,
        { backgroundColor: colors.elevated, borderColor: colors.border },
      ]}
    >
      <View style={styles.calHeader}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          disabled={atCurrentMonth}
          hitSlop={10}
          style={{ opacity: atCurrentMonth ? 0.3 : 1, padding: 4 }}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="700" size={14}>
          {monthLabel}
        </AppText>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={{ padding: 4 }}>
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={`${w}-${i}`} style={styles.dayCell}>
            <AppText size={11} weight="600" color={colors.mutedForeground}>
              {w}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }
          const dateStr = ymd(viewYear, viewMonth, day);
          const isPast = dateStr < today;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          return (
            <Pressable
              key={dateStr}
              onPress={() => !isPast && onChange(dateStr)}
              disabled={isPast}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.dayInner,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected &&
                    isToday && {
                      borderWidth: 1,
                      borderColor: colors.primary,
                    },
                ]}
              >
                <AppText
                  size={13}
                  weight={isSelected ? "700" : "600"}
                  color={
                    isSelected
                      ? colors.primaryForeground
                      : isPast
                        ? colors.mutedForeground
                        : colors.foreground
                  }
                  style={isPast ? { opacity: 0.4 } : undefined}
                >
                  {day}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Time selector: hour + AM/PM (minutes are always :00).
 * Value in/out is 24h "HH:MM".
 */
export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (time24: string) => void;
}) {
  const colors = useColors();
  const [h24Str] = value.split(":");
  const h24 = Number(h24Str);
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

  function emit(h12: number, mer: "AM" | "PM") {
    let h = h12 % 12;
    if (mer === "PM") h += 12;
    onChange(`${pad2(h)}:00`);
  }

  const pill = (
    label: string,
    active: boolean,
    onPress: () => void,
    key?: string,
  ) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.elevated,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <AppText
        size={13}
        weight="600"
        color={active ? colors.primaryForeground : colors.mutedForeground}
      >
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText size={12} weight="600" color={colors.mutedForeground} style={{ width: 52 }}>
          Hour
        </AppText>
        <View style={styles.pillWrap}>
          {HOURS.map((h) =>
            pill(String(h), h === hour12, () => emit(h, meridiem), `h-${h}`),
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText size={12} weight="600" color={colors.mutedForeground} style={{ width: 52 }}>
          AM/PM
        </AppText>
        <View style={styles.pillWrap}>
          {(["AM", "PM"] as const).map((m) =>
            pill(m, m === meridiem, () => emit(hour12, m), `mer-${m}`),
          )}
        </View>
      </View>
      <AppText size={12} color={colors.mutedForeground}>
        Selected time: {hour12} {meridiem}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pillWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
