// Mini spark bars — 5 recent values 0..3; last bar highlighted in `color`.
export function Spark({
  values,
  color = "var(--green-500)",
  width = 54,
  height = 22,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const bw = (width - 4 * 4) / 5;
  return (
    <svg width={width} height={height} style={{ display: "block" }} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(3, (v / 3) * height);
        return (
          <rect
            key={i}
            x={i * (bw + 4)}
            y={height - h}
            width={bw}
            height={h}
            rx={2}
            fill={i === values.length - 1 ? color : "#dde1e4"}
          />
        );
      })}
    </svg>
  );
}
