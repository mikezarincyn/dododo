// Reliable upload to /api/submissions via XMLHttpRequest (NOT fetch) so we get
// real upload progress (xhr.upload.onprogress — fetch doesn't expose it). No
// client-side compression: the raw recorded/selected File is sent as-is; the
// server remuxes the container losslessly.

export interface UploadHandle {
  promise: Promise<{ submission_id: string }>;
  abort: () => void;
}

export type UploadFn = (
  childId: string,
  scenario: string,
  file: File,
  onProgress?: (pct: number) => void,
) => Promise<{ submission_id: string }>;

export function uploadSubmissionWithHandle(
  childId: string,
  scenario: string,
  file: File,
  onProgress?: (pct: number) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ submission_id: string }>((resolve, reject) => {
    xhr.open("POST", "/api/submissions");
    xhr.responseType = "json";
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = xhr.response || {};
        resolve(body as { submission_id: string });
      } else {
        reject(new Error(`upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.onabort = () => reject(new Error("aborted"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("child_id", childId);
    fd.append("scenario", scenario);
    xhr.send(fd);
  });
  return { promise, abort: () => xhr.abort() };
}

export const uploadSubmission: UploadFn = (childId, scenario, file, onProgress) =>
  uploadSubmissionWithHandle(childId, scenario, file, onProgress).promise;
