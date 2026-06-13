// Тонкий API-клиент. Запись согласия идёт на бэкенд, который ставит timestamp,
// consent_version, jurisdiction и хранит запись в UK-регионе (см. backend P3/P1).

export type ConsentResult = {
  session_id: string;
  consent_id: string;
  child_id: string;
  display_code: string;
  consent_version: string;
  timestamp_utc: string;
};

export type UploadResult = { submission_id: string };

// Загрузка видео родителем на single-origin backend. Токен не нужен — родительский
// поток за общим демо-гейтом (HTTP Basic браузер подставляет сам). Имя ребёнка не
// передаётся: только child_id (псевдоним), полученный на шаге согласия.
export async function uploadVideo(childId: string | null, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (childId) form.append("child_id", childId);
  const res = await fetch("/api/submissions", { method: "POST", body: form });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  return (await res.json()) as UploadResult;
}

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
