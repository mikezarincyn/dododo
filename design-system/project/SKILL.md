---
name: dododo-design
description: Use this skill to generate well-branded interfaces and assets for Dododo, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## What's here
- `styles.css` — global entry point (import this). Tokens for colour, type, spacing, radii, shadows.
- `readme.md` — the full design guide: company context, content fundamentals (voice/tone), visual foundations, iconography, and a file index.
- `tokens/` — the raw + semantic CSS custom properties.
- `guidelines/` — foundation specimen cards (Type, Colors, Spacing, Brand).
- `components/` — React primitives: Button, Badge, Card, ConfettiBurst, CheckItem, ProgressBar, Input, Logo. Each has a `.d.ts` + `.prompt.md`.
- `ui_kits/website/` — the marketing site (interactive screening flow).
- `ui_kits/app/` — the mobile app (Today's plan + development profile).
- `assets/` — logo + confetti/sparkle SVGs.

## The essentials (if you read nothing else)
- **Voice:** warm, calm, reassuring, empowering. Professional but **never clinical or alarming**. Second person ("you", "your child").
- **Signature headline:** two-tone — calm statement in Poppins **400**, emotional payload in **700**. ("The waiting list can take months. But your child's **development isn't waiting**.")
- **Colour:** green `#72BCA1` = action, navy `#0D3276` = headings/trust, ink `#2B2A2A` = body (muted = ink at 50–80% opacity). Confetti (yellow/blush/blue) = playful accents. Coral `#EE6C4D` only for "most popular".
- **Shape:** fully-rounded pill buttons (72px), cards rounded 16–24px with soft navy-tinted shadows, everything rounded — never sharp.
- **Type:** Poppins 700 headings, Inter body/UI. Big, generous sizes, lots of whitespace.
- **No emoji.** Icons are thin line-icons (Lucide). Photography = candid real parents + kids, warm and happy.
