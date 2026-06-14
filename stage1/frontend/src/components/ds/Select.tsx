import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
}

// DS select with chevron affordance. onChange passes the value string.
export function Select({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      {label ? <span className="field-label">{label}</span> : null}
      <div style={{ position: "relative" }}>
        <select
          className="ds-select"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ color: value ? "var(--ink-900)" : "var(--text-subtle)", opacity: disabled ? 0.55 : 1 }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", insetInlineEnd: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)", display: "inline-flex" }}>
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
    </label>
  );
}
