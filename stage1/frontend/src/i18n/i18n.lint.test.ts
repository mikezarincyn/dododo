// Lint не-диагностического языка (P2). Падает, если запрещённое слово попало в
// любую UI-строку. Держит продукт вне MDR/SaMD — не ослаблять.
//
// Сканирует ВЕСЬ i18n-словарь (единственный источник UI-строк: consent/upload/
// console). Разрешены негирующие формулировки («not a diagnosis») — они снимаются
// перед проверкой, чтобы дисклеймеры не ловились как нарушения.

import { describe, expect, it } from "vitest";

import { en } from "./en";

const BANNED: RegExp[] = [
  /\bdiagnos(e|es|ed|ing|is|tic|tics)\b/i, // diagnosis/diagnose/diagnostic…
  /\bassessment\b/i,
  /\bscreening result/i,
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

const ALL_STRINGS = [...walk(en)];

describe("non-diagnostic language lint", () => {
  it("collects a non-trivial number of UI strings", () => {
    expect(ALL_STRINGS.length).toBeGreaterThan(15);
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

  it("the lint actually catches a banned word (guard against a no-op check)", () => {
    const bad = "We will diagnose your child's disorder and share the screening result.";
    const caught = BANNED.some((p) => p.test(strip(bad)));
    expect(caught).toBe(true);
  });

  it("permitted negations are not flagged", () => {
    const ok = "This is not a medical diagnosis. It does not provide a diagnosis.";
    const caught = BANNED.some((p) => p.test(strip(ok)));
    expect(caught).toBe(false);
  });
});
