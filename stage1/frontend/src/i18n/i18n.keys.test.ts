import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { STR } from "./strings";
import { DOMAINS } from "../data/reference";

// GATE: no structured i18n key may reach the UI as raw text.
// A "structured key" is a dotted identifier like "console.signInTitle" (vs. an
// English content string used as its own key, e.g. "No therapist yet", which is
// intentionally passed through). Every structured key used in code MUST exist in
// STR.en — otherwise the screen shows the literal key (the prod bug we fixed).

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const STRUCTURED = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) && !e.name.endsWith("strings.ts")) out.push(p);
  }
  return out;
}

// Pull literal first-args of t("...") / t('...') (concatenations like t("domain."+x)
// are deliberately NOT matched — those dynamic families are covered explicitly below).
function literalKeysIn(code: string): string[] {
  const keys: string[] = [];
  for (const re of [/\bt\(\s*"([^"]+)"\s*[),]/g, /\bt\(\s*'([^']+)'\s*[),]/g]) {
    for (const m of code.matchAll(re)) keys.push(m[1]);
  }
  return keys;
}

// Dynamic key families built at runtime via t("prefix." + value).
const DYNAMIC_KEYS: string[] = [
  ...DOMAINS.map((d) => `domain.${d.id}`),
  ...["improving", "steady", "declining"].map((x) => `trend.${x}`),
  ...["queued", "processing", "ready", "error", "inCalibration", "confirmed", "accepted", "sent"].map((x) => `status.${x}`),
  ...["ot", "parent", "clinic"].flatMap((r) => [`role.${r}`, `role.${r}.desc`]),
  ...["received", "processing", "specialist"].map((x) => `parent.safe.step.${x}`),
  ...["good", "partial", "low"].map((x) => `parent.safe.quality.${x}`),
];

describe("no missing i18n keys", () => {
  const files = sourceFiles(SRC);

  it("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every structured key used in code exists in STR.en (no raw key leaks to UI)", () => {
    const used = new Set<string>();
    for (const f of files) {
      for (const k of literalKeysIn(readFileSync(f, "utf8"))) {
        if (STRUCTURED.test(k)) used.add(k);
      }
    }
    for (const k of DYNAMIC_KEYS) used.add(k);

    const missing = [...used].filter((k) => STR.en[k] === undefined).sort();
    expect(missing, `Missing from STR.en: ${missing.join(", ")}`).toEqual([]);
  });

  it("guards against a no-op check (a fake missing key would be caught)", () => {
    expect(STRUCTURED.test("totally.madeup.key")).toBe(true);
    expect(STR.en["totally.madeup.key"]).toBeUndefined();
  });

  it("the four reported sign-in keys are present (regression)", () => {
    for (const k of ["console.signInTitle", "console.signInIntro", "console.accessToken", "console.signIn"]) {
      expect(STR.en[k], `${k} must be translated`).toBeTruthy();
    }
  });

  // sanity: the report references SRC under the frontend src tree
  it("resolves the src directory", () => {
    expect(relative(SRC, files[0]).startsWith("..")).toBe(false);
  });
});
