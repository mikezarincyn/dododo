import { useState } from "react";

import { Icon } from "./Icon";
import { LANGS, type Lang } from "../../i18n/strings";

// Language switcher with a small dropdown. Persists nothing itself — the caller
// owns `lang` (DesignApp stores it in localStorage and flips document dir).
export function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0];
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          border: "1.5px solid var(--border-subtle)",
          background: "var(--white)",
          borderRadius: "var(--radius-pill)",
          padding: "9px 16px",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--navy-700)",
        }}
      >
        <Icon name="globe" size={16} />
        <span>{cur.label}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: "absolute",
              insetInlineEnd: 0,
              top: "calc(100% + 8px)",
              zIndex: 100,
              background: "var(--white)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-float)",
              padding: 6,
              minWidth: 170,
            }}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  border: "none",
                  background: l.code === lang ? "var(--green-100)" : "transparent",
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: 14.5,
                  fontWeight: l.code === lang ? 700 : 500,
                  color: l.code === lang ? "var(--green-ink)" : "var(--ink-900)",
                  textAlign: "start",
                }}
              >
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.code === lang ? <Icon name="check" size={15} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
