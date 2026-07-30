import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getListGymsQueryKey,
  getListMyComplaintsQueryKey,
  useCreateComplaint,
  useListGyms,
  useListMyComplaints,
  type Complaint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateLabel } from "@/lib/dates";

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const STATUS_LABELS: Record<Complaint["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export default function ComplaintScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [gymId, setGymId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const gymsQuery = useListGyms(undefined, {
    query: { queryKey: getListGymsQueryKey(undefined) },
  });
  const mineQuery = useListMyComplaints({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getListMyComplaintsQueryKey(),
    },
  });
  const createComplaint = useCreateComplaint();

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  async function onSubmit() {
    if (subject.trim().length < 3) {
      notify("Add a subject", "Please write a short subject for your complaint.");
      return;
    }
    if (message.trim().length < 10) {
      notify(
        "Tell us more",
        "Please describe the problem in a few more words (at least 10 characters).",
      );
      return;
    }
    setBusy(true);
    try {
      await createComplaint.mutateAsync({
        data: {
          subject: subject.trim(),
          message: message.trim(),
          ...(gymId ? { gymId } : {}),
        },
      });
      setSubject("");
      setMessage("");
      setGymId(null);
      await queryClient.invalidateQueries({
        queryKey: getListMyComplaintsQueryKey(),
      });
      notify(
        "Complaint raised ✅",
        "Your ticket has been sent to the gym team. You'll see their reply here.",
      );
    } catch (err) {
      notify(
        "Could not send",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 14,
    backgroundColor: colors.card,
  } as const;

  const complaints = mineQuery.data ?? [];

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Complaint" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Something not right? Raise a ticket and it goes straight to the gym
        management and your branch team.
      </AppText>

      <Card>
        <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
          Raise a ticket
        </AppText>
        <View style={{ gap: 10 }}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject (e.g. AC not working)"
            placeholderTextColor={colors.mutedForeground}
            maxLength={120}
            style={inputStyle}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the problem..."
            placeholderTextColor={colors.mutedForeground}
            maxLength={2000}
            multiline
            numberOfLines={4}
            style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]}
          />
          {(gymsQuery.data ?? []).length > 0 ? (
            <View>
              <AppText size={12} color={colors.mutedForeground} style={{ marginBottom: 6 }}>
                Which branch is this about? (optional)
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(gymsQuery.data ?? []).map((g) => {
                  const on = gymId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGymId(on ? null : g.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? `${colors.primary}14` : "transparent",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <AppText
                        size={12}
                        weight={on ? "700" : "400"}
                        color={on ? colors.primary : colors.mutedForeground}
                      >
                        {g.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Button label="Submit complaint" onPress={onSubmit} loading={busy} icon="send" />
        </View>
      </Card>

      <AppText weight="700" size={15} style={{ marginTop: 20, marginBottom: 8 }}>
        Your tickets
      </AppText>
      {mineQuery.isLoading ? (
        <LoadingView />
      ) : mineQuery.isError ? (
        <ErrorView onRetry={() => void mineQuery.refetch()} />
      ) : complaints.length === 0 ? (
        <Card>
          <AppText muted size={13}>
            No complaints yet. Anything you raise will show up here with its
            status and the team's reply.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {complaints.map((c) => {
            const done = c.status === "resolved";
            return (
              <Card key={c.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="700" size={14}>
                      {c.subject}
                    </AppText>
                    <AppText size={12} color={colors.mutedForeground} style={{ marginTop: 2 }}>
                      {[c.gymName, istDateLabel(c.createdAt.slice(0, 10))]
                        .filter(Boolean)
                        .join(" · ")}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor: done
                        ? `${colors.primary}22`
                        : colors.muted,
                    }}
                  >
                    <Feather
                      name={done ? "check-circle" : "clock"}
                      size={12}
                      color={done ? colors.primary : colors.mutedForeground}
                    />
                    <AppText
                      size={11}
                      weight="700"
                      color={done ? colors.primary : colors.mutedForeground}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </AppText>
                  </View>
                </View>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 8 }}>
                  {c.message}
                </AppText>
                {c.response ? (
                  <View
                    style={{
                      marginTop: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.primary,
                      paddingLeft: 10,
                    }}
                  >
                    <AppText size={11} weight="700" color={colors.primary}>
                      Reply from the team
                    </AppText>
                    <AppText size={13} style={{ marginTop: 2 }}>
                      {c.response}
                    </AppText>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
