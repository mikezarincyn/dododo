import type { ChangeEvent } from "react";

// DS text input with optional field label. onChange passes the native event
// (matches the design source's <Input onChange={(e)=>...}> usage).
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      {label ? <span className="field-label">{label}</span> : null}
      <input className="ds-input" type={type} value={value} placeholder={placeholder} onChange={onChange} />
    </label>
  );
}
