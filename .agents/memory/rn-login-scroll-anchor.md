---
name: RN/web bottom-anchored auth layout
description: Correct way to pin a logo top + form bottom on a full-bleed login without the logo drifting or the form clipping (Expo + react-native-web).
---

# Bottom-anchored auth screen (logo top, form bottom)

For a full-bleed cinematic login (hero image behind, brand logo at top, auth form at
the bottom), the robust cross-platform recipe is:

- Wrap in `KeyboardAvoidingView` → `ScrollView`.
- `ScrollView` `contentContainerStyle` = `{ flexGrow: 1, paddingHorizontal, paddingTop, paddingBottom }`.
- Logo is the first child (small, `alignSelf:center`, `aspectRatio:1`, capped `maxWidth`).
- Form wrapper uses `marginTop: "auto"` to sit at the bottom.
- `keyboardShouldPersistTaps="handled"`, `bounces={false}`.

**Why:** A `flex: 1` spacer *child* inside a ScrollView expands unbounded on
react-native-web — it shoves the form far below the fold (blank screen) and makes the
logo appear to "drift up/down" as content reflows. A fully non-scroll `flex` column
fixes drift but then clips lower controls on short viewports / when the keyboard opens.
`flexGrow:1` on the content container + `marginTop:"auto"` on the form gives bottom
anchoring when there's room AND graceful scroll when there isn't — no unbounded child.

**How to apply:** Any time a login/onboarding screen needs "logo top, actions bottom"
over a background image. Never use a `flex:1` spacer View inside a ScrollView to push
content down.
