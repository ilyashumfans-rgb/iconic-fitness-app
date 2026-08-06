import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { customFetch } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";

type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

// Public endpoint — works for guests and members alike. These are the same
// FAQs staff manage in the admin panel (Content → FAQs & AI Knowledge).
function useFaqs() {
  return useQuery({
    queryKey: ["public-faqs"],
    queryFn: () => customFetch<Faq[]>("/api/faqs"),
    staleTime: 5 * 60 * 1000,
  });
}

export default function FaqScreen() {
  const colors = useColors();
  const { data, isPending, isError, refetch } = useFaqs();
  const [openId, setOpenId] = useState<number | null>(null);

  const faqs = Array.isArray(data) ? data : [];

  // Group by category, preserving the server's sort order.
  const groups: { category: string; items: Faq[] }[] = [];
  for (const f of faqs) {
    const category = f.category?.trim() || "General";
    const existing = groups.find((g) => g.category === category);
    if (existing) existing.items.push(f);
    else groups.push({ category, items: [f] });
  }

  return (
    <Screen>
      <ModalHeader title="FAQs" />
      <AppText
        size={13}
        style={{ color: colors.mutedForeground, marginBottom: 16 }}
      >
        Everything you need to know about Iconic Fitness.
      </AppText>

      {isPending ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <Card tone="elevated" style={{ alignItems: "center", gap: 10 }}>
          <AppText muted size={14} style={{ textAlign: "center" }}>
            Couldn't load the FAQs. Check your connection and try again.
          </AppText>
          <Pressable onPress={() => void refetch()} hitSlop={8}>
            <AppText weight="700" size={14} style={{ color: colors.primary }}>
              Retry
            </AppText>
          </Pressable>
        </Card>
      ) : faqs.length === 0 ? (
        <Card tone="elevated" style={{ alignItems: "center" }}>
          <AppText muted size={14} style={{ textAlign: "center" }}>
            No FAQs yet — check back soon.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: 20, paddingBottom: 24 }}>
          {groups.map((group) => (
            <View key={group.category} style={{ gap: 10 }}>
              <AppText
                weight="700"
                size={13}
                style={{
                  color: colors.mutedForeground,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {group.category}
              </AppText>
              {group.items.map((f) => {
                const isOpen = openId === f.id;
                return (
                  <Card key={f.id} tone="elevated" style={{ gap: 0 }}>
                    <Pressable
                      onPress={() => setOpenId(isOpen ? null : f.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                      hitSlop={6}
                    >
                      <AppText weight="700" size={14} style={{ flex: 1 }}>
                        {f.question}
                      </AppText>
                      <Feather
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                    {isOpen ? (
                      <AppText
                        size={13}
                        style={{
                          color: colors.mutedForeground,
                          lineHeight: 20,
                          marginTop: 8,
                        }}
                      >
                        {f.answer}
                      </AppText>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
