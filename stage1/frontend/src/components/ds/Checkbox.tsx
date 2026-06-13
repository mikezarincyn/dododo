// Интерактивный чекбокс с крупной зоной нажатия (mobile web, аудитория уровня
// WhatsApp). Контролируемый, НЕ пред-проставлен вызывающим кодом.

export function Checkbox({
  id,
  checked,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={`cb-${id}`}
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        paddingBlock: "var(--space-3)",
        cursor: "pointer",
        minBlockSize: 44,
      }}
    >
      <input
        id={`cb-${id}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          inlineSize: 26,
          blockSize: 26,
          marginBlockStart: 2,
          flex: "0 0 auto",
          accentColor: "var(--green-500)",
        }}
      />
      <span className="ds-body" style={{ lineHeight: "var(--lh-body)" }}>
        {label}
      </span>
    </label>
  );
}
