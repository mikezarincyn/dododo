// Soft pastel avatar with initials. Colour is derived from the name so it's
// stable per person. Never shows a photo (pseudonymous by design).
const PALETTE = [
  "var(--confetti-yellow)",
  "var(--blush-100)",
  "var(--confetti-blue)",
  "var(--lilac-100)",
  "var(--green-100)",
];

export function Avatar({ name, size = 38 }: { name?: string; size?: number }) {
  const safe = name || "?";
  const idx = safe.charCodeAt(0) % PALETTE.length;
  const initials = safe
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: PALETTE[idx],
        color: "var(--navy-700)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </span>
  );
}
