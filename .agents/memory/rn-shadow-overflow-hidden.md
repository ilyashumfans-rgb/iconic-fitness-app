---
name: RN shadow + overflow:hidden
description: Why premium card shadows vanish on iOS and how to structure the views
---

# iOS shadows die when the shadowed view also clips

On iOS a view with `overflow: "hidden"` (masksToBounds) clips its own shadow, so
rounded "floating card" shadows silently disappear — even though they render fine
on web (boxShadow) and Android (elevation).

**Rule:** split into two layers.
- **Outer wrapper** gets the shadow + `borderRadius` + an opaque `backgroundColor`
  (iOS needs a background for the shadow path). No `overflow:hidden`.
- **Inner view** gets `overflow:"hidden"` + matching `borderRadius` to clip the
  image / gradient / content.

**Why:** discovered redesigning the Iconic Fitness mobile Home screen — cards had
`CARD_SHADOW` on the same view as `overflow:"hidden"`, so shadows only showed on
web. Applies to any rounded card that clips media (gym cards, category tiles,
gradient CTAs).

**How to apply:** define shadow tokens via `Platform.select({ web: { boxShadow },
default: { shadowColor/Offset/Opacity/Radius, elevation } })`, put them on the
outer wrapper. Views that use the shared `Card` component are safe (Card has no
`overflow:hidden`).
