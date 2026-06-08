List items and progress indicators.

```jsx
<CheckItem title="Know what's happening — right now">
  A 20-minute screening gives you a clear picture across 6 key areas.
</CheckItem>
<CheckItem kind="cross" title="Frequent meltdowns" />

<ProgressBar filled={3} segments={6} status="typical" label="Building" />
```

- `CheckItem.kind`: `check` (lilac bubble, navy title — positive lists) or `cross` (outlined square — problem lists).
- `ProgressBar.status` tints the fill: `typical` green, `building` teal, `emerging` yellow, `watch` coral.
