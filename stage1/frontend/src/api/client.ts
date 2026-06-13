// Тонкий API-клиент. Запись согласия идёт на бэкенд, который ставит timestamp,
// consent_version, jurisdiction и хранит запись в UK-регионе (см. backend P3/P1).

export type ConsentResult = {
  session_id: string;
  consent_id: string;
  display_code: string;
  consent_version: string;
  timestamp_utc: string;
};

export async function postConsent(checkedIds: string[]): Promise<ConsentResult> {
  const res = await fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checked_ids: checkedIds }),
  });
  if (!res.ok) {
    throw new Error(`consent failed: ${res.status}`);
  }
  return (await res.json()) as ConsentResult;
}
