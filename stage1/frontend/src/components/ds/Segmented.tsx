export interface SegmentedOption {
  value: string;
  label: string;
}

// DS segmented control (Yes / Partly / No, attempt, score…). onChange passes value.
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <span className="seg">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}
