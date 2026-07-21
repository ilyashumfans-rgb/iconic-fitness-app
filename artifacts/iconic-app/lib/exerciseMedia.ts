/**
 * Two-frame demo images per exercise (start + end position), bundled locally.
 * Source: free-exercise-db (public domain). The detail screen flips between
 * the frames to animate the movement like a GIF.
 */
import type { ImageSourcePropType } from "react-native";

export const EXERCISE_FRAMES: Record<
  string,
  [ImageSourcePropType, ImageSourcePropType]
> = {
  "bench-press": [
    require("@/assets/exercises/bench-press-0.jpg"),
    require("@/assets/exercises/bench-press-1.jpg"),
  ],
  "dumbbell-press": [
    require("@/assets/exercises/dumbbell-press-0.jpg"),
    require("@/assets/exercises/dumbbell-press-1.jpg"),
  ],
  "push-up": [
    require("@/assets/exercises/push-up-0.jpg"),
    require("@/assets/exercises/push-up-1.jpg"),
  ],
  deadlift: [
    require("@/assets/exercises/deadlift-0.jpg"),
    require("@/assets/exercises/deadlift-1.jpg"),
  ],
  "barbell-row": [
    require("@/assets/exercises/barbell-row-0.jpg"),
    require("@/assets/exercises/barbell-row-1.jpg"),
  ],
  "lat-pulldown": [
    require("@/assets/exercises/lat-pulldown-0.jpg"),
    require("@/assets/exercises/lat-pulldown-1.jpg"),
  ],
  "back-squat": [
    require("@/assets/exercises/back-squat-0.jpg"),
    require("@/assets/exercises/back-squat-1.jpg"),
  ],
  "goblet-squat": [
    require("@/assets/exercises/goblet-squat-0.jpg"),
    require("@/assets/exercises/goblet-squat-1.jpg"),
  ],
  lunge: [
    require("@/assets/exercises/lunge-0.jpg"),
    require("@/assets/exercises/lunge-1.jpg"),
  ],
  "overhead-press": [
    require("@/assets/exercises/overhead-press-0.jpg"),
    require("@/assets/exercises/overhead-press-1.jpg"),
  ],
  "lateral-raise": [
    require("@/assets/exercises/lateral-raise-0.jpg"),
    require("@/assets/exercises/lateral-raise-1.jpg"),
  ],
  "bicep-curl": [
    require("@/assets/exercises/bicep-curl-0.jpg"),
    require("@/assets/exercises/bicep-curl-1.jpg"),
  ],
  "tricep-dip": [
    require("@/assets/exercises/tricep-dip-0.jpg"),
    require("@/assets/exercises/tricep-dip-1.jpg"),
  ],
  plank: [
    require("@/assets/exercises/plank-0.jpg"),
    require("@/assets/exercises/plank-1.jpg"),
  ],
  "hanging-leg-raise": [
    require("@/assets/exercises/hanging-leg-raise-0.jpg"),
    require("@/assets/exercises/hanging-leg-raise-1.jpg"),
  ],
  burpee: [
    require("@/assets/exercises/burpee-0.jpg"),
    require("@/assets/exercises/burpee-1.jpg"),
  ],
  "mountain-climber": [
    require("@/assets/exercises/mountain-climber-0.jpg"),
    require("@/assets/exercises/mountain-climber-1.jpg"),
  ],
  "jump-rope": [
    require("@/assets/exercises/jump-rope-0.jpg"),
    require("@/assets/exercises/jump-rope-1.jpg"),
  ],
  "kettlebell-swing": [
    require("@/assets/exercises/kettlebell-swing-0.jpg"),
    require("@/assets/exercises/kettlebell-swing-1.jpg"),
  ],
  thruster: [
    require("@/assets/exercises/thruster-0.jpg"),
    require("@/assets/exercises/thruster-1.jpg"),
  ],
};
