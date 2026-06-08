# App UI kit — Dododo mobile app

A faithful recreation of the Dododo iOS/Android app, composed from the design
system's component primitives inside an iPhone device frame.

## Run
Open `index.html`. Loads React + Babel, Lucide icons (CDN), the compiled
`_ds_bundle.js`, the iOS frame starter, then each screen file.

## Screens
- `TodayScreen.jsx` — top bar (logo · minutes · star points · avatar), an
  11-day streak row, a "For you" foundation card, and "Today's plan" activity
  cards (vestibular / tactile / proprioceptive) with time + points.
- `ProfileScreen.jsx` — the child's development profile: a 7-axis sensory
  **radar** with domain icon chips, plus per-domain segmented progress rows
  (Emotional Regulation, Joint Attention, Sensory Processing).
- `TabBar.jsx` — bottom navigation: Today · For you · Kid's plan · Profile.
- `app.jsx` — wraps screens in `IOSDevice`; tab bar switches screens.
- `shared.jsx` — `Ico` (Lucide) + activity thumbnail placeholder.

## Interactions
Tap the bottom tabs to switch screens. "View all" on the Today screen jumps to
the development profile.

## Notes
- Icons are **Lucide** (CDN) — the documented substitute for Dododo's
  thin line-icon set.
- Activity thumbnails + avatar are tinted placeholders.
- The radar uses a small inline SVG (data-viz), tinted with status colours.
