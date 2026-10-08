import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Button } from "@/components/Button";
import { MemberJourneyDetails, type JourneyView } from "@/components/MemberJourneyDetails";
import { JourneyFeedbackForm, type JourneyFeedback } from "@/components/JourneyFeedbackForm";

export type { JourneyFeedback };

export function MemberJourneyContent({ journey, onFeedback, refresh, busy }: {
  journey: JourneyView;
  onFeedback: (feedback: JourneyFeedback) => Promise<void>;
  refresh: () => Promise<void>;
  busy: boolean;
}) {
  const router = useRouter();
  return <View style={{ gap: 20 }}>
    <MemberJourneyDetails journey={journey} onOpenActivity={href => router.push(href as Href)} />
    <JourneyFeedbackForm journey={journey} onFeedback={onFeedback} refresh={refresh} busy={busy} />
    <Button label="BCA / BMI report & assessment" variant="secondary" onPress={() => router.push("/assessment")} />
    <Button label="View attendance history" variant="secondary" onPress={() => router.push("/attendance")} />
  </View>;
}
