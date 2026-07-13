import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  useAiChat,
  useAiCoach,
  useGetMe,
  type AiChatMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { ModalHeader } from "@/components/ModalHeader";
import { WEB_NOTCH_TOP } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";

const ASSESSED_GREETING =
  "Hey, I'm your Iconic coach. I can see your workouts, water, meals and goals — ask me anything, or tap a starter below.";

const ONBOARDING_GREETING =
  "Hey, I'm your Iconic coach. Let's start with a quick fitness assessment so I can build a plan that's right for you. First up — are you new to the gym, or already training regularly?";

const ASSESSED_STARTERS = [
  "How am I doing today?",
  "Build me a workout for today",
  "What should I eat to hit my protein goal?",
  "Help me keep my streak alive",
];

const ONBOARDING_STARTERS = [
  "I'm new to the gym",
  "I already train regularly",
  "Start my fitness assessment",
];

const GUEST_GREETING =
  "Hi! I'm the Iconic Fitness assistant. Ask me about our branches, membership plans, classes, trainers — or how to join. You can even buy a plan right here in the app, no account needed.";

const GUEST_STARTERS = [
  "What membership plans do you have?",
  "How do I enroll and pay online?",
  "Which branches are near me?",
  "What group classes do you offer?",
];

export default function CoachScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const coach = useAiCoach();
  const chat = useAiChat();
  // Guests (and signed-out viewers) talk to the public Iconic assistant; signed-in
  // members get the personalized coach with their own tracking data.
  const isMember = isLoaded && !!isSignedIn;
  const active = isMember ? coach : chat;
  const meQuery = useGetMe({
    query: { enabled: isMember, queryKey: getGetMeQueryKey() },
  });
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // Default to "assessed" until we know, so we never wrongly nudge an existing
  // member to redo their assessment while /me is loading.
  const assessmentComplete = meQuery.data?.assessmentComplete ?? true;
  const greeting: AiChatMessage = {
    role: "assistant",
    content: !isMember
      ? GUEST_GREETING
      : assessmentComplete
        ? ASSESSED_GREETING
        : ONBOARDING_GREETING,
  };
  const starters = !isMember
    ? GUEST_STARTERS
    : assessmentComplete
      ? ASSESSED_STARTERS
      : ONBOARDING_STARTERS;

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || active.isPending) return;

    const next: AiChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    active.mutate(
      { data: { messages: next } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.reply },
          ]);
          // The member coach may have logged data, saved the assessment, or
          // changed goals — refresh the tracker and profile.
          if (isMember) {
            void queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey[0];
                if (typeof key !== "string") return false;
                return (
                  key.startsWith("/api/tracking") ||
                  key.startsWith("/api/me") ||
                  key.startsWith("/api/goals")
                );
              },
            });
          }
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, something went wrong. Please try again.",
            },
          ]);
        },
      },
    );
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "web" ? WEB_NOTCH_TOP : 8,
        }}
      >
        <ModalHeader title="AI Coach" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          <Bubble message={greeting} />
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {active.isPending ? <Typing /> : null}

          {messages.length === 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {starters.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Feather name="zap" size={15} color={colors.primary} />
                  <AppText size={14} style={{ flex: 1 }}>
                    {s}
                  </AppText>
                  <Feather
                    name="arrow-up-right"
                    size={15}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              color: colors.foreground,
              fontFamily: "Inter_500Medium",
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || active.isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: !input.trim() || active.isPending ? 0.5 : 1,
            }}
          >
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Feather name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: AiChatMessage }) {
  const colors = useColors();
  const isUser = message.role === "user";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          maxWidth: "86%",
          backgroundColor: isUser ? colors.primary : colors.elevated,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <AppText
          size={15}
          color={isUser ? colors.primaryForeground : colors.foreground}
          style={{ lineHeight: 21 }}
        >
          {message.content}
        </AppText>
      </View>
    </View>
  );
}

function Typing() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-start" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: colors.elevated,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <AppText size={14} muted>
          Coaching…
        </AppText>
      </View>
    </View>
  );
}
