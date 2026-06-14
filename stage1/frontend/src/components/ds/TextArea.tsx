// DS multi-line input. onChange passes the value string (matches design API).
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      {label ? <span className="field-label">{label}</span> : null}
      <textarea className="ds-textarea" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
