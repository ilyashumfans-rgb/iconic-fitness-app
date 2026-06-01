---
name: Gradient default Button variant + bg overrides
description: Why some buttons need !bg-none after the default Button variant became a gradient
---
The gymco default `Button` variant uses `bg-gradient-brand` (a `background-image` linear-gradient), not a `bg-*` color.

**Rule:** Any default-variant Button that overrides only its background *color* (e.g. `bg-slate-900`, `bg-white`) still renders the gradient on top, because `background-image` paints over `background-color`. To make the solid/white color win, add `!bg-none` (clears `background-image !important`) alongside the `bg-*` class.

**Why:** background-image and background-color are different CSS properties; twMerge does not dedupe the custom `bg-gradient-brand` class against tailwind `bg-*` colors, so both apply and the gradient wins.

**How to apply:** When a default Button must be a flat color, either switch to a non-default variant, drop the redundant `bg-*` (let it be the brand gradient), or add `!bg-none`. Large white-text surfaces use `.bg-gradient-brand-deep` (darker) for readability; buttons use the bright `.bg-gradient-brand`.
