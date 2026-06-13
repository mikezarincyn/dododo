// API-клиент консоли специалиста. Видео загружается как blob с Authorization-
// заголовком (токен НЕ попадает в URL/логи), затем проигрывается через ObjectURL.
// Отдельной «скачать» операции нет — стрим только для inline-просмотра.

export type QueueItem = {
  submission_id: string;
  display_code: string;
  state: string;
  assigned_reviewer: string | null;
  created_at: string;
};

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchQueue(token: string): Promise<QueueItem[]> {
  const res = await fetch("/api/console/queue", { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`queue ${res.status}`);
  return ((await res.json()) as { items: QueueItem[] }).items;
}

export async function loadVideoBlob(token: string, submissionId: string): Promise<Blob> {
  const res = await fetch(`/api/console/video/${submissionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`video ${res.status}`);
  return await res.blob();
}

// Завершение просмотра: сохранить обратную связь И авто-удалить видео (P5).
// Видео не доживает до долговременного хранения.
export async function completeReview(
  token: string,
  submissionId: string,
  note: string,
): Promise<void> {
  const res = await fetch(`/api/console/complete/${submissionId}`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error(`complete ${res.status}`);
}
