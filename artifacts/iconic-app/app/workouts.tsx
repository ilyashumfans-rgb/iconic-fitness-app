import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useRef } from "react";
import { ScrollView } from "react-native";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { WorkoutsTab } from "@/components/progress/WorkoutsTab";
import { memberAuthHref } from "@/lib/memberAuth";

export default function WorkoutsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && !isSignedIn) {
    return <Redirect href={memberAuthHref("/workouts")} />;
  }
  return (
    <Screen ref={scrollRef} edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Workouts" fallbackHref="/(tabs)/train" />
      <WorkoutsTab onEdit={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
    </Screen>
  );
}