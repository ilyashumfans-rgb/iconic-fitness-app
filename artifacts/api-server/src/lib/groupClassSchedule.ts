// Default weekly group-class (GX) timetable applied to every gym branch until a
// partner customises their own. Days run Monday–Saturday with two fixed
// one-hour slots (7–8 AM and 7–8 PM). Partners can edit these per branch; this
// constant is the shared starting point and the read fallback for branches that
// have not customised yet.

export type GroupClassScheduleEntry = {
  dayOfWeek: number; // 1 = Mon … 7 = Sun
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  className: string;
  sortOrder: number;
};

export const GROUP_CLASS_DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const AM = { startTime: "07:00", endTime: "08:00" };
const PM = { startTime: "19:00", endTime: "20:00" };

export const DEFAULT_GROUP_CLASS_SCHEDULE: GroupClassScheduleEntry[] = [
  { dayOfWeek: 1, ...AM, className: "iconic Zumba", sortOrder: 0 },
  { dayOfWeek: 1, ...PM, className: "iconic Zumba", sortOrder: 1 },
  { dayOfWeek: 2, ...AM, className: "iconic Dance Fitness", sortOrder: 0 },
  { dayOfWeek: 2, ...PM, className: "iconic Zumba", sortOrder: 1 },
  { dayOfWeek: 3, ...AM, className: "iconic Yoga", sortOrder: 0 },
  { dayOfWeek: 3, ...PM, className: "iconic Pilates", sortOrder: 1 },
  { dayOfWeek: 4, ...AM, className: "iconic HIIT", sortOrder: 0 },
  { dayOfWeek: 4, ...PM, className: "iconic Dance Fitness", sortOrder: 1 },
  { dayOfWeek: 5, ...AM, className: "iconic Dance Fitness", sortOrder: 0 },
  { dayOfWeek: 5, ...PM, className: "iconic Yoga", sortOrder: 1 },
  { dayOfWeek: 6, ...AM, className: "iconic Yoga", sortOrder: 0 },
  { dayOfWeek: 6, ...PM, className: "iconic Dance Fitness", sortOrder: 1 },
];
