# Dododo — Design System

> Warm, calm, reassuring. A developmental-screening + home-activity platform
> for parents of young children (~3–7). Professional and credible, but
> explicitly **non-clinical**.

---

## 1. Company & product context

**Dododo** helps parents who are stuck on long NHS / CAMHS waiting lists *do
something now*. The product:

1. **Free 20-minute developmental screening** across 6 areas — communication,
   sensory processing, emotional regulation, social interaction, motor skills,
   daily routines.
2. **A personalised daily activity plan** (15–20 min/day, no equipment) built by
   UK-certified occupational therapists using an NHS-style clinical framework.
3. **Progress tracking** the parent can take to their next appointment.

**Surfaces**
- **Marketing website** (desktop + mobile) — the conversion funnel: problem →
  solution → social proof → pricing → CTA. *(UI kit: `ui_kits/website/`)*
- **Mobile app** (iOS / Android) — Today's plan, For-you content, kid's
  development profile (radar across the 6 areas), per-domain progress.
  *(UI kit: `ui_kits/app/`)*

**Core audience:** parents — mostly mums — of 3–7-year-olds, worried, waiting,
and wanting agency. They are tired of "wait and see."

**Brand voice:** warm, calm, reassuring, empowering. Professional and credible
but never clinical or alarming.

### Sources given
- `uploads/dododo logo.svg` → copied to `assets/dododo-logo.svg`
- 8 marketing-website screenshots (hero, problem grid, "understand your child",
  professional + parent testimonials, how-it-works with app mockup, challenge/
  solution, pricing). Stored under `uploads/`.
- Typography, type-scale, color, and shape/spacing specs supplied as written
  notes (transcribed into the token files).

> No codebase or Figma file was provided — the system is reconstructed from the
> brand spec + screenshots. Hex values, type scale, and spacing are taken
> verbatim from the supplied spec and are exact; layouts in the UI kits are
> faithful recreations of the screenshots.

---

## 2. Content fundamentals — how Dododo writes

**Point of view.** Second person, always. The reader is "**you**", the subject
is "**your child**". Dododo refers to itself by name ("With Dododo…"), rarely
"we". Therapists are quoted in first person ("My families wait 12, 18,
sometimes 24 months…").

**Casing.** Sentence case for headings and body. **Buttons are UPPERCASE** only
in the nav CTA ("START SCREENING"); in-page buttons use sentence case ("Get a
clear picture", "Start screening", "Let's go!"). Eyebrows are uppercase with
wide tracking ("WHAT PARENTS SAY", "PRICING", "WHAT PROFESSIONALS SAY").

**Tone.** Validating before reassuring — name the hard thing, then offer agency.
- Acknowledge: *"The waiting list can take months."*
- Reframe: *"But your child's **development isn't waiting**."*
- Empower: *"…you don't have to wait to understand what's going on."*

**The two-tone headline.** The signature move: a calm statement in regular
weight, with the emotional payload in **bold**. Always one idea, split in two:
- "The waiting list can take months. But your child's **development isn't waiting**."
- "The system is overwhelmed. **But your child isn't pausing for it.**"
- "From families who stopped waiting and **started doing**."

**Sentence rhythm.** Short. Confident. Often fragments for punch — *"Calm.
Confidence. Progress."* / *"Today, not in 18 months."* / *"No equipment. No
specialist knowledge."*

**Credibility markers, lightly worn.** "UK-certified occupational therapists",
"the same clinical framework used in NHS practice — made accessible at home."
Specifics build trust ("over 10 years of experience", "14-month wait") but the
register stays warm, never clinical.

**What it avoids.** Diagnosis language, alarm, jargon, hype. No "disorder",
no "treatment", no fear. Never promises outcomes it can't make — it promises
*understanding and a plan*, not a cure.

**Emoji:** none. Warmth comes from words, photography, and confetti shapes — not
emoji.

---

## 3. Visual foundations

**Overall vibe.** Soft, warm, optimistic, airy. Lots of whitespace. White
page with occasional tinted full-bleed sections (mint green, blush pink, soft
yellow). Never dense, never cold.

**Color.**
- **Green `#72BCA1`** is the primary action colour (CTAs, brand). Hover lightens
  to `#89CCB3`. Soft green `#DCF3EA` is the resting state of the nav pill.
- **Navy `#0D3276`** carries headings, links and trust. It is the dominant text
  colour for anything large.
- **Ink `#2B2A2A`** is body text; muted/secondary text is the same ink at 50–80%
  opacity (never a separate grey).
- **Teal-blue `#58B4B7`** is the secondary button.
- **Confetti** — yellow `#FFD983`, blush `#EFCFC9`, light-blue `#D0EFFB` — are
  the playful geometric accents (circles + triangles) sprinkled around the
  wordmark and in section corners. Coral `#EE6C4D` is reserved for the "most
  popular" badge. Blush `#F9D7DB` backs the testimonials band.

**Type.** Poppins 700 for headings (letter-spacing 0.02em, tight line-height,
`text-wrap: balance`). Inter for all body + UI. Big, generous sizes — H1 is
80px on desktop. The two-tone weight trick (400 base / 700 emphasis) is the
core typographic device.

**Backgrounds.** Mostly flat white. Tinted sections use solid fills or a soft
radial/linear gradient (the green pricing band fades lighter at the edges).
No textures, no photographic backgrounds, no heavy gradients. Confetti shapes
sit in corners as sparse decoration. A faint diamond "sparkle" (◇ outline)
appears in the testimonial bands.

**Photography.** Real parents + kids, candid and happy, warm natural light.
Mum-and-child closeness, painting, play. Never stock-clinical, never cold.
Images sit in soft-cornered frames (radius ~16–24px) or full-bleed in a
column. Avoid medical/cold imagery entirely.

**Cards.** White, rounded 16–24px, soft shadow (`0 8px 24px rgba(13,50,118,.08)`),
often a hairline navy border at ~10% opacity. They float on tinted section
backgrounds. The "challenge vs with-dododo" pattern pairs a neutral-grey card
against a mint-tinted card with a green border.

**Buttons.** Fully-rounded pills (`border-radius: 9999px`), min-height 72px
(54px small), ~40px horizontal padding. Three styles: solid green (primary),
solid teal (secondary), and outlined (1.5px ink border on white). The soft
nav pill is green-100 with green text.

**Corners.** Everything is rounded. No sharp corners anywhere — pills for
actions, 16–24px for cards, circles for avatars and confetti dots.

**Shadows.** Soft and diffuse, tinted navy or green — never hard black drop
shadows. Floating elements (the testimonial card overlapping the hero photo,
the app screenshots) get a slightly deeper float shadow.

**Animation.** Restrained. Gentle fades and small upward reveals on scroll;
soft ease (`cubic-bezier(.22,.61,.36,1)`-ish). Hovers are calm. No bounces, no
spinners, no infinite loops on content.

**Hover / press states.** Primary buttons lighten on hover (green 500 → 400),
not darken. Outlined buttons fill softly. Press = a subtle scale-down (~0.98)
and/or a slightly deeper colour. Links shift toward green. Nothing jumpy.

**Borders.** Hairline only. Card borders are navy at ~10% opacity; outlined
buttons use a 1.5px solid ink stroke; the with-dododo card uses a green border.

**Transparency & blur.** Used sparingly — muted text via ink opacity, soft
edge-fades on tinted bands. No glassmorphism.

**Layout rules.** Generous section padding (100px desktop → 40px mobile
vertical; 50px → 16px sides). Content is rarely full-width — comfortable max
line lengths, lots of breathing room. The nav CTA pill is fixed top-right.

---

## 4. Iconography

Dododo uses a **thin, single-stroke line-icon** style (the app's bottom nav —
calendar, open book, grid, sliders — and the small domain icons around the
sensory radar). The closest widely-available match is **Lucide** (formerly
Feather) — same ~1.5–2px even stroke, rounded caps, friendly geometry.

> **Substitution flagged:** no original icon font/SVGs were supplied, so this
> system links **Lucide via CDN** as the icon set. If Dododo has its own icon
> assets, drop them into `assets/icons/` and update this section.

- **Checks:** small circular lilac bubble (`--lilac-100`) with a navy check —
  used in "Understand your child" and "With Dododo" lists.
- **Crosses (problem lists):** a square outlined ✕ in ink, neutral grey context.
- **Domain icons** (around the radar): rounded circular chips, one per
  developmental domain, tinted by status (green = typical, yellow = emerging,
  coral = watch).
- **Sparkle:** a four-point diamond outline (◇) as sparse decoration in
  testimonial bands.
- **Confetti:** circles + triangles in the three confetti colours — brand
  decoration, not icons. Provided as SVG in `assets/`.
- **Emoji / unicode icons:** not used.

---

## 5. Index / manifest

**Root**
- `styles.css` — global entry point (import this). `@import`s only.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible wrapper.

**Tokens** (`tokens/`)
- `fonts.css` — Poppins + Inter (Google Fonts CDN).
- `colors.css` — palette + semantic aliases.
- `typography.css` — families, scale, weights, line-heights, tracking.
- `spacing.css` — spacing scale, section rhythm, radii, shadows.
- `base.css` — base type helpers (`.ds-h1`, `.ds-eyebrow`, two-tone, …).

**Foundation cards** (`guidelines/`) — specimen cards for the Design System tab
(Type, Colors, Spacing, Brand).

**Components** (`components/`) — see each directory's card + `.prompt.md`.
- `actions/` — Button, PillBadge
- `surfaces/` — Card, ConfettiBurst
- `feedback/` — CheckItem, ProgressBar
- `forms/` — Input
- `brand/` — Logo

**UI kits** (`ui_kits/`)
- `website/` — marketing site (hero, problem grid, how-it-works, pricing,
  testimonials).
- `app/` — mobile app (Today's plan, kid's development profile).

**Assets** (`assets/`) — logo, confetti SVGs.

---

## 6. Notes & caveats
- **Fonts** are loaded from Google Fonts CDN (Poppins, Inter). Both match the
  spec exactly — no substitution needed. Swap to self-hosted `.woff2` +
  `@font-face` if offline use is required.
- **Icons** use Lucide via CDN as a substitute for the (unsupplied) original
  set — see Iconography.
- **Photography** in the UI kits uses image placeholders (no real brand photos
  were supplied). Replace with Dododo's candid parent-and-child library.
