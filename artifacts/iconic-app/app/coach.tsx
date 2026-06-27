import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useAiCoach, type AiChatMessage } from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { ModalHeader } from "@/components/ModalHeader";
import { useColors } from "@/hooks/useColors";

const GREETING: AiChatMessage = {
  role: "assistant",
  content:
    "Hey, I'm your Iconic coach. I can see your workouts, water, meals and goals — ask me anything, or tap a starter below.",
};

const STARTERS = [
  "How am I doing today?",
  "Build me a workout for today",
  "What should I eat to hit my protein goal?",
  "Help me keep my streak alive",
];

export default function CoachScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const coach = useAiCoach();
  const [messages, setMessages] = useState<AiChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || coach.isPending) return;

    const next: AiChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    coach.mutate(
      { data: { messages: next.filter((m) => m !== GREETING) } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.reply },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, something went wrong reaching your coach. Please try again.",
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
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
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
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {coach.isPending ? <Typing /> : null}

          {messages.length === 1 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {STARTERS.map((s) => (
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
            disabled={!input.trim() || coach.isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              opacity: !input.trim() || coach.isPending ? 0.5 : 1,
            }}
          >
            <Feather name="arrow-up" size={20} color={colors.primaryForeground} />
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
