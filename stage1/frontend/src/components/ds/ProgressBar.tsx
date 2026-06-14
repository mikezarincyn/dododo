export type ProgressStatus = "typical" | "building" | "emerging" | "watch";

const STATUS_COLOR: Record<ProgressStatus, string> = {
  typical: "var(--status-typical)",
  building: "var(--status-building)",
  emerging: "var(--status-emerging)",
  watch: "var(--status-watch)",
};

// Segmented development-band bar: `filled` of `segments` coloured by status.
export function ProgressBar({
  filled,
  segments = 6,
  status = "building",
}: {
  filled: number;
  segments?: number;
  status?: ProgressStatus;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: 8,
            borderRadius: "var(--radius-pill)",
            background: i < filled ? STATUS_COLOR[status] : "#e7e9eb",
          }}
        />
      ))}
    </div>
  );
}
