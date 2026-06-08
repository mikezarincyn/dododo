# Website UI kit — Dododo marketing site

A faithful recreation of the Dododo marketing site, composed from the design
system's component primitives.

## Run
Open `index.html`. It loads React + Babel, the compiled `_ds_bundle.js`, then
each section file.

## Sections
- `Nav.jsx` — sticky header with logo + soft "START SCREENING" pill.
- `Hero.jsx` — two-tone headline + floating OT testimonial card over a photo.
- `ProblemGrid.jsx` — "The system is overwhelmed" 4-card grid.
- `Understand.jsx` — photo + 3 check-item value props.
- `Compare.jsx` — "The challenge" (grey) vs "With Dododo" (mint) cards.
- `Pricing.jsx` — green gradient band, 3 plans, coral "most popular" badge.
- `Testimonials.jsx` — blush band, specialist quotes, sparkle accents.
- `ScreeningModal.jsx` — interactive 3-step screening overlay (name → areas → done).
- `app.jsx` — composes everything; wires the CTAs to open the screening modal.
- `shared.jsx` — `Photo` / `Avatar` placeholders (swap for real brand photos).

## Interactions
Every "Start screening" / "Get a clear picture" / "Let's go!" CTA opens the
screening modal. The modal walks through child details → developmental areas →
confirmation, with a progress bar.

## Notes
- Photos are tinted placeholders — no real brand photography was supplied.
- All colour, type, shape comes from `styles.css` tokens via the bundle.
