import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
