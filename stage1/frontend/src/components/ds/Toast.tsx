import { useCallback, useRef, useState } from "react";

import { Icon } from "./Icon";

// Lightweight toast: useToast() returns [msg, show]; show(text) flashes a pill
// for ~3.2s. Render <ToastView msg={msg} /> once near the app root.
export function useToast(): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  return [msg, show];
}

export function ToastView({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check" size={16} />
      {msg}
    </div>
  );
}
