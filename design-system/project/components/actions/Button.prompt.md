Fully-rounded pill button — the primary action element across Dododo's web and app surfaces.

```jsx
<Button variant="primary" iconRight="→">Get a clear picture</Button>
<Button variant="soft" uppercase iconRight="→">Start screening</Button>
<Button variant="outline">Choose plan</Button>
```

- `variant`: `primary` (solid green, the default CTA), `secondary` (solid teal), `outline` (ink stroke on white), `soft` (green-100 pill with green text — the nav CTA resting state).
- `size`: `lg` (72px, default) or `sm` (54px).
- `uppercase`: wide-tracked caps, used only for the nav "START SCREENING" CTA.
- Primary lightens on hover (never darkens) and carries a soft green pill shadow.
