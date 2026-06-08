White rounded card with soft shadow, plus a decorative ConfettiBurst overlay.

```jsx
<Card>Today's plan…</Card>
<Card tone="mint">With Dododo, you understand why it's happening.</Card>

<div style={{ position: 'relative' }}>
  <ConfettiBurst pieces="default" />
  …hero content…
</div>
```

- `Card.tone`: `white` (default, soft shadow), `mint` (green border — the "with dododo" card), `grey` (the "challenge" card), `yellow`.
- `ConfettiBurst` must sit in a `position: relative` parent; set `assetBase` to the relative path of `assets/`.
