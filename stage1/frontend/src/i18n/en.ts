// Единый источник UI-строк (EN-UK, продакшн). Локали RU/др. добавляются рядом
// (en.ts → ru.ts …) без правки компонентов. Ключи чекбоксов = стабильные id из
// consent/consentConfig.ts и backend stage1_config.CONSENT_REQUIRED_CHECKBOX_IDS.
//
// НЕ-ДИАГНОСТИЧЕСКИЙ ЯЗЫК (несущая красная линия — держит продукт вне MDR/SaMD):
// ни одна строка не должна утверждать диагноз/оценку. Запрещённые слова проверяет
// lint-тест src/i18n/i18n.lint.test.ts. Разрешено: "observations", "feedback",
// "a specialist will review". Тексты согласия — verbatim (P1); менять только
// синхронно с CONSENT_VERSION.

export const en = {
  common: {
    loading: "Loading…",
    saved: "Saved.",
    demoBanner: "DEMO — sample data only, not for real children's videos",
  },
  consent: {
    title: "Before a specialist looks",
    intro: "Please confirm each point below. All are required to continue.",
    continue: "Continue",
    error: "Something went wrong. Please try again.",
    disclaimer:
      "dododo offers observations and feedback to support families. It is not a medical device and does not provide a diagnosis.",
    checkboxes: {
      guardian_authority:
        "I confirm I am the parent or legal guardian of the child in this video and I have the authority to provide this video.",
      specialist_review_feedback:
        "I agree that a specialist may review this video to provide general observations and feedback about my child's development. This is not a medical diagnosis.",
      explicit_processing:
        "I explicitly consent to the processing of information relating to my child's development contained in this video.",
      review_then_delete:
        "I understand that this video is reviewed by a specialist and then deleted, and that I can withdraw consent before review or ask for confirmation of deletion.",
    },
  },
  upload: {
    title: "Share a short video",
    intro:
      "Record or choose a short everyday moment. A specialist will review it and share observations and feedback.",
    chooseVideo: "Record or choose a video",
    contourAlt: "Outline showing where to place your child in the frame",
    // Плашки доверия на экране загрузки (P2).
    trust: {
      liveSpecialist: "A real specialist will review your video",
      notDiagnosis: "This is not a diagnosis",
      encrypted: "Your video is encrypted",
      deletedAfterReview: "Your video is deleted after it has been reviewed",
    },
    queuedTitle: "Thank you",
    queuedBody: "A specialist will review your video and share observations and feedback.",
  },
  console: {
    signInTitle: "Specialist console",
    signInIntro: "Sign in to review assigned videos.",
    accessToken: "Access token",
    signIn: "Sign in",
    signInError: "Sign-in failed or no access.",
    queueTitle: "Review queue",
    queueEmpty: "Nothing to review right now.",
    open: "Open",
    back: "Queue",
    reviewTitle: "Review",
    feedbackLabel: "Observations & feedback",
    feedbackPlaceholder: "General observations about what you noticed…",
    saveFeedback: "Save feedback",
    loadError: "Could not load video.",
    saveError: "Could not save feedback.",
  },
} as const;

export type Strings = typeof en;
