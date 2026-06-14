// Lint не-диагностического языка (P2). Падает, если запрещённое слово попало в
// ЛЮБУЮ UI-строку. Держит продукт вне MDR/SaMD — не ослаблять.
//
// Сканирует ОБА источника UI-строк: en.ts (consent/upload/console) И strings.ts
// (основное приложение, ВСЕ 4 локали en/de/ar/ko). Раньше сканировался только
// en.ts — это была дыра: запрет не охранял живые строки приложения. Закрыто (Этап
// SaMD-language). Разрешённые негирующие формулировки («not a diagnosis») снимаются
// перед проверкой, чтобы дисклеймеры не ловились как нарушения.
//
// Ограничение: регэкспы латинские — английские/латинские триггеры ловятся в любой
// локали (напр. если «autism» попадёт в de/ar/ko-значение), но смысловой триггер
// ВНУТРИ арабского/корейского текста этим не ловится → переводы проверяются носителем.

import { describe, expect, it } from "vitest";

import { en } from "./en";
import { STR } from "./strings";

const BANNED: RegExp[] = [
  /\bdiagnos(e|es|ed|ing|is|tic|tics)\b/i, // diagnosis/diagnose/diagnostic…
  /\bassessment\b/i,
  /\bscreen(ing|ed|s)?\b/i,                // screening/screen
  /\bdetect(s|ed|ing|ion|or|ors)?\b/i,     // detect/detection
  /\brisk\b/i,                             // risk / risk score / risk of
  /\bpredict(s|ed|ing|ion|ive)?\b/i,       // predict/prediction
  /\bdevelopmental delay\b/i,
  /\bsymptom(s)?\b/i,
  /\babnormal\b/i,
  /\bautism\b/i,
  /\bautistic\b/i,
  /\bdisorder(s)?\b/i,
  /\bASD\b/, // синоним (аббревиатура)
  /\bpatholog(y|ical)\b/i,
];

// Явно разрешённые негирующие фразы (мы хотим говорить «это НЕ диагноз»).
const ALLOWED = [
  "does not provide a diagnosis",
  "not a medical diagnosis",
  "not a diagnosis",
  "non-diagnostic",
].sort((a, b) => b.length - a.length); // длинные снимаем первыми

function* walk(node: unknown): Generator<string> {
  if (typeof node === "string") {
    yield node;
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) yield* walk(value);
  }
}

function strip(text: string): string {
  let out = text.toLowerCase();
  for (const phrase of ALLOWED) out = out.split(phrase).join(" ");
  return out;
}

// Both UI-string sources, all locales.
const ALL_STRINGS = [...walk(en), ...walk(STR)];

describe("non-diagnostic language lint (en.ts + strings.ts, all locales)", () => {
  it("collects a non-trivial number of UI strings", () => {
    expect(ALL_STRINGS.length).toBeGreaterThan(200); // strings.ts × 4 locales is large
  });

  for (const pattern of BANNED) {
    it(`no UI string contains banned ${pattern}`, () => {
      const offenders = ALL_STRINGS.filter((s) => pattern.test(strip(s)));
      expect(
        offenders,
        `banned ${pattern} found in: ${offenders.join(" | ")}`,
      ).toEqual([]);
    });
  }

  it("the lint actually catches banned words (guard against a no-op check)", () => {
    const bad = "We detect the child's symptoms, screen for autism risk and predict the disorder.";
    const caught = BANNED.some((p) => p.test(strip(bad)));
    expect(caught).toBe(true);
  });

  it("permitted negations are not flagged", () => {
    const ok = "This is not a medical diagnosis. It does not provide a diagnosis.";
    const caught = BANNED.some((p) => p.test(strip(ok)));
    expect(caught).toBe(false);
  });
});
