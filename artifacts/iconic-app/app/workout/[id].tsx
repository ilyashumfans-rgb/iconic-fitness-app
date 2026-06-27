import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { WorkoutDetailView } from "@/components/WorkoutDetailView";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";
import { useColors } from "@/hooks/useColors";
import { getWorkout, workoutExercises } from "@/lib/workouts";

export default function WorkoutDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = getWorkout(String(id));
  const [running, setRunning] = useState(false);

  if (!workout) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <AppText weight="700" size={16}>
          Workout not found
        </AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText color={colors.primary} weight="700">
            Go back
          </AppText>
        </Pressable>
      </View>
    );
  }

  const exercises = workoutExercises(workout);

  if (running) {
    return (
      <WorkoutPlayer
        workout={workout}
        exercises={exercises}
        onClose={() => setRunning(false)}
      />
    );
  }

  return (
    <WorkoutDetailView
      workout={workout}
      exercises={exercises}
      onStart={() => setRunning(true)}
    />
  );
}
