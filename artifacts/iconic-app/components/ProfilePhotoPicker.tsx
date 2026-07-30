import { Feather } from "@expo/vector-icons";
import { customFetch, getGetMeQueryKey, useUpdateMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/**
 * Member profile photo: shows the current photo (or an initial) with
 * "Camera" / "Gallery" actions. The picked image is uploaded to the server
 * (compressed there), saved as the member's avatar, and synced everywhere
 * the member's photo is shown (member card, account page).
 */
export function ProfilePhotoPicker({
  avatarUrl,
  name,
  size = 96,
}: {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const updateMe = useUpdateMe();
  const [busy, setBusy] = useState(false);
  // Show the fresh photo immediately after upload (before the /me refetch).
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const shownUrl = localUrl ?? (avatarUrl ? resolveImageUrl(avatarUrl) : undefined);
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";

  async function uploadFromUri(uri: string) {
    setBusy(true);
    try {
      const fetched = await fetch(uri);
      const blob = await fetched.blob();
      const uploaded = await customFetch<{ url: string }>(
        "/api/storage/uploads/inline",
        {
          method: "POST",
          body: blob,
          headers: {
            "x-filename": "profile-photo.jpg",
            "content-type": "application/octet-stream",
          },
        },
      );
      await updateMe.mutateAsync({ data: { avatarUrl: uploaded.url } });
      setLocalUrl(resolveImageUrl(uploaded.url) ?? null);
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err) {
      notify(
        "Photo not saved",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Permission needed", "Allow photo access to choose a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const uri = result.canceled ? null : result.assets?.[0]?.uri;
    if (uri) await uploadFromUri(uri);
  }

  async function takePhoto() {
    // Camera capture isn't available in web browsers via expo-image-picker;
    // fall back to the file picker there (mobile browsers offer the camera).
    if (Platform.OS === "web") {
      await pickFromGallery();
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify("Permission needed", "Allow camera access to take your photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    const uri = result.canceled ? null : result.assets?.[0]?.uri;
    if (uri) await uploadFromUri(uri);
  }

  return (
    <View style={{ alignItems: "center", gap: 10 }}>
      <View>
        {shownUrl ? (
          <Image
            source={{ uri: shownUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText weight="700" size={size * 0.34} color={colors.primaryForeground}>
              {initial}
            </AppText>
          </View>
        )}
        {busy ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: size / 2,
              backgroundColor: "rgba(0,0,0,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => void takePhoto()}
          disabled={busy}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Feather name="camera" size={15} color={colors.foreground} />
          <AppText weight="600" size={13}>
            Camera
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => void pickFromGallery()}
          disabled={busy}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Feather name="image" size={15} color={colors.foreground} />
          <AppText weight="600" size={13}>
            Gallery
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
