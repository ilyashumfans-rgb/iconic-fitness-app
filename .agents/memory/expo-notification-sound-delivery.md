---
name: Expo notification sound + in-app delivery (no push infra)
description: How the Iconic member app surfaces server notifications with sound when there is no remote push (Expo Go).
---

# In-app notification alerts without push

**Context:** Iconic member app runs in Expo Go, which has **no remote push delivery**
(SDK 53+). Member notifications are plain DB rows created by admins
(`recipientType='user'`), fetched via `GET /notifications/mine`. There is no
push token / no server→device delivery channel.

**Approach that works:**
- A bell polls `GET /notifications/mine` (react-query `refetchInterval`) and shows
  an unread badge; tapping opens a feed screen that marks all read on open.
- To make a *newly arrived* notification **chime while the app is open**, detect
  the delta client-side and fire a **local** notification
  (`scheduleNotificationAsync`) — that is what actually plays the sound.

**Sound gotchas (both required):**
1. Global `setNotificationHandler` must return `shouldPlaySound: true` (default
   scaffold had it `false` → silent).
2. On **Android** sound comes from the **notification channel**, not per-message
   content. Create a HIGH-importance channel with `sound:"default"` and pass its
   `channelId` on every scheduled trigger. iOS uses `content.sound:"default"` +
   `trigger:null`. An immediate local notification on Android needs a real
   trigger (TIME_INTERVAL ~1s) to be channel-backed; `trigger:null` alone can be
   silent.

**Delta / high-water-mark rules (avoid double-chime):**
- Track a persisted `maxId` watermark **scoped per user id**
  (`iconic.lastSeenNotificationId.<userId>`); reset the in-memory ref when the
  signed-in user changes.
- **First load only records** the watermark — never back-fires for pre-existing
  notifications.
- Advance + persist the watermark **before** awaiting per-item scheduling, and
  guard the async effect with an in-flight ref, so overlapping 60s polls can't
  re-fire the same items.

**Why:** without this, "no icon + no sound" — the scaffold never surfaced the
existing member feed and had sound disabled. This is the pattern to reuse for any
new server-driven member alert until real Expo push is set up.

## Admin-uploaded custom notification sounds
- Android channel sound is sticky/immutable after creation — a custom clip can't become the channel sound at runtime. Instead: play the clip in-app via expo-audio (`createAudioPlayer({uri}).play()`, cleanup `.remove()`) and route the banner through a separate always-silent channel (`sound: null` from day one) to avoid double sound.
- Sound URLs live in `app_settings` key/value table (`notificationSound.members|trainers`); public GET /settings/notification-sounds, admin PUT gated to `/api/storage/db-images/` paths only. Storage upload now sniffs audio magic bytes (mp3/wav/ogg/m4a, 2MB cap, no sharp).
