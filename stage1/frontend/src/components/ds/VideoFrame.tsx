import { Icon } from "./Icon";

// Dark video placeholder with a play affordance and a corner tag. Used for clip
// previews on annotation / observation-detail screens (no real video bytes —
// no-retention: clips are deleted after review).
export function VideoFrame({ label, time, height }: { label?: string; time?: string; height?: number }) {
  return (
    <div className="vid-frame" style={height ? { aspectRatio: "auto", height } : undefined}>
      <span className="vid-tag">{label || "DEMO CLIP"}</span>
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(255,255,255,.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="play" size={26} color="#fff" style={{ marginInlineStart: 3 }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".04em", opacity: 0.8, whiteSpace: "nowrap" }}>{time || ""}</span>
    </div>
  );
}
