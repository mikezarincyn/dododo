// Стабильные id чекбоксов согласия. Должны совпадать с backend
// stage1_config.CONSENT_REQUIRED_CHECKBOX_IDS и ключами i18n consent.checkboxes.
//
// TODO-LAWYER: verifiable parental consent. В Стадии 1 верификация родителя —
// self-attestation (чекбокс guardian_authority). Это НЕ полный verifiable
// parental consent. Для пилота на ≤30 семей требуется подтверждение юриста, что
// self-attestation является достаточными «разумными усилиями».

export const REQUIRED_CHECKBOX_IDS = [
  "guardian_authority",
  "specialist_review_feedback",
  "explicit_processing",
  "review_then_delete",
] as const;

export type RequiredCheckboxId = (typeof REQUIRED_CHECKBOX_IDS)[number];

// Зарезервированы на будущие стадии — в Стадии 1 НЕ показываются и не отправляются.
// id храним стабильными, чтобы добавить без миграции:
//   biometric_auto_analysis  — скрыт: BIOMETRIC_ANALYSIS=OFF
//   retention_recalibration  — скрыт: VIDEO_RETENTION=NONE
export const HIDDEN_CHECKBOX_IDS = [
  "biometric_auto_analysis",
  "retention_recalibration",
] as const;
