import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { t } from "../i18n";
import { UploadScreen } from "./UploadScreen";

describe("UploadScreen trust badges", () => {
  it("shows all four trust badges on the upload screen", () => {
    render(<UploadScreen />);
    const b = t().upload.trust;
    expect(screen.getByText(b.liveSpecialist)).toBeInTheDocument(); // живой специалист
    expect(screen.getByText(b.notDiagnosis)).toBeInTheDocument(); // не диагноз
    expect(screen.getByText(b.encrypted)).toBeInTheDocument(); // шифруется
    expect(screen.getByText(b.deletedAfterReview)).toBeInTheDocument(); // удаляется после просмотра
  });

  it("uses the native capture file input (no live camera overlay)", () => {
    render(<UploadScreen />);
    const input = screen.getByTestId("video-input");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "video/*");
    expect(input).toHaveAttribute("capture");
  });

  it("uploads the selected file with child_id and shows the queued screen", async () => {
    const user = userEvent.setup();
    const upload = vi.fn(async () => ({ submission_id: "s1" }));
    render(<UploadScreen childId="abc123" upload={upload} />);
    const input = screen.getByTestId("video-input");
    const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
    await user.upload(input, file);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith("abc123", file); // child_id (псевдоним), не имя
    expect(await screen.findByText(t().upload.queuedTitle)).toBeInTheDocument();
  });

  it("shows a frame preview, the file name and an uploading status while sending", async () => {
    const user = userEvent.setup();
    // Отложенный промис: ловим промежуточное состояние до завершения отправки.
    let resolveUpload: (v: { submission_id: string }) => void = () => {};
    const upload = vi.fn(
      () => new Promise<{ submission_id: string }>((res) => (resolveUpload = res)),
    );
    render(<UploadScreen childId="abc123" upload={upload} />);
    const input = screen.getByTestId("video-input");
    const file = new File([new Uint8Array([1, 2, 3])], "my-clip.mp4", { type: "video/mp4" });
    await user.upload(input, file);

    // Превью кадра + имя файла + статус загрузки видны во время отправки.
    expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    expect(screen.getByText("my-clip.mp4")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(t().upload.uploading);

    resolveUpload({ submission_id: "s1" });
    expect(await screen.findByText(t().upload.queuedTitle)).toBeInTheDocument();
  });

  it("lets the parent choose another video after an upload error", async () => {
    const user = userEvent.setup();
    const upload = vi.fn(async () => {
      throw new Error("network");
    });
    render(<UploadScreen childId="abc123" upload={upload} />);
    const input = screen.getByTestId("video-input");
    const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // Кнопка переключается в режим повторного выбора.
    expect(screen.getByRole("button", { name: t().upload.retry })).toBeEnabled();
  });
});
