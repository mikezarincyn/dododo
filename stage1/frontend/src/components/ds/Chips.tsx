import { Icon } from "./Icon";
import type { TFunc } from "../../i18n/strings";

// Upload processing state → pill (queued / processing / ready / error).
const STATUS_MAP: Record<string, { bg: string; color: string; icon: string; spin?: boolean }> = {
  queued: { bg: "var(--lilac-100)", color: "var(--navy-700)", icon: "clock" },
  processing: { bg: "var(--yellow-surface-100)", color: "var(--yellow-ink)", icon: "refresh-cw", spin: true },
  ready: { bg: "var(--green-100)", color: "var(--green-ink)", icon: "check" },
  error: { bg: "rgba(238,108,77,.14)", color: "var(--coral-500)", icon: "alert-triangle" },
};

export function StatusBadge({ state, t, small }: { state: string; t: TFunc; small?: boolean }) {
  const m = STATUS_MAP[state] || STATUS_MAP.queued;
  return (
    <span className="chip" style={{ background: m.bg, color: m.color, fontSize: small ? 12 : 13 }}>
      <span className={m.spin ? "spin-slow" : ""} style={{ display: "inline-flex" }}>
        <Icon name={m.icon} size={small ? 12 : 13} />
      </span>
      {t("status." + state)}
    </span>
  );
}

// "In calibration" — auto-metric not yet confirmed by the OT (never counted in trends).
export function CalBadge({ t, small }: { t: TFunc; small?: boolean }) {
  return (
    <span className="chip" style={{ background: "var(--yellow-surface-100)", color: "var(--yellow-ink)", fontSize: small ? 11.5 : 13 }}>
      <Icon name="gauge" size={small ? 12 : 13} />
      {t("status.inCalibration")}
    </span>
  );
}

// "Confirmed by OT" — human-in-the-loop verified metric.
export function ConfirmedBadge({ t, small }: { t: TFunc; small?: boolean }) {
  return (
    <span className="chip" style={{ background: "var(--green-100)", color: "var(--green-ink)", fontSize: small ? 11.5 : 13 }}>
      <Icon name="check" size={small ? 12 : 13} />
      {t("status.confirmed")}
    </span>
  );
}

// Per-domain trend chip (improving / steady / declining).
const TREND_MAP: Record<string, { bg: string; color: string; icon: string }> = {
  improving: { bg: "var(--green-100)", color: "var(--green-ink)", icon: "trending-up" },
  steady: { bg: "var(--grey-surface-100)", color: "var(--text-muted)", icon: "move-right" },
  declining: { bg: "rgba(238,108,77,.14)", color: "var(--coral-500)", icon: "trending-down" },
};

export function TrendChip({ trend, t, small }: { trend: string; t: TFunc; small?: boolean }) {
  const m = TREND_MAP[trend] || TREND_MAP.steady;
  return (
    <span className="chip" style={{ background: m.bg, color: m.color, fontSize: small ? 12 : 13 }}>
      <Icon name={m.icon} size={small ? 12 : 13} />
      {t("trend." + trend)}
    </span>
  );
}
