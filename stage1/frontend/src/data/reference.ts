// Reference data ported from the design bundle (data.jsx + ot-annotate.jsx).
// Non-sensitive constants used by OT screens. Labels go through t() at render
// (English text as key → translated where available, else passthrough).

export interface Domain {
  id: string;
  icon: string;
}
export const DOMAINS: Domain[] = [
  { id: "attention", icon: "eye" },
  { id: "communication", icon: "message-circle" },
  { id: "movement", icon: "hand" },
  { id: "regulation", icon: "ear" },
  { id: "body", icon: "heart" },
  { id: "independence", icon: "sun" },
];

export interface Scenario {
  id: string;
  label: string;
}
export const SCENARIOS: Scenario[] = [
  { id: "name", label: "Response to name" },
  { id: "freeplay", label: "Free play" },
  { id: "joint", label: "Joint attention with a toy" },
  { id: "mealtime", label: "Mealtime routine" },
  { id: "imitation", label: "Imitation game" },
];

// Which development domains an observation of each scenario touches (used to
// attribute the confirmed score to domains for trend computation).
export const SCENARIO_DOMAINS: Record<string, string[]> = {
  name: ["attention", "communication"],
  joint: ["attention", "communication", "body"],
  freeplay: ["movement", "regulation"],
  mealtime: ["independence", "regulation"],
  imitation: ["movement", "body", "communication"],
};

export interface FilmingGuide {
  setup: string;
  tips: string[];
  duration: string;
}
export const FILMING_GUIDES: Record<string, FilmingGuide> = {
  name: {
    setup: "A calm room, child engaged with a toy. Caller stands 2–3 steps behind or beside.",
    tips: [
      "Film the child’s face and upper body — the reaction is in the eyes and shoulders.",
      "Call the name once, then stay silent for 5 seconds before the next call (max 3).",
      "Keep the camera still; don’t zoom while calling.",
    ],
    duration: "30–90 seconds",
  },
  joint: {
    setup: "Sit across from the child with one interesting toy within reach.",
    tips: [
      "Get both the child’s face and the toy in the frame.",
      "Point at the toy and wait — let the child’s gaze travel at its own pace.",
      "Capture 2–3 point-and-look cycles if you can.",
    ],
    duration: "1–2 minutes",
  },
  mealtime: {
    setup: "An ordinary meal at the usual table — nothing staged.",
    tips: [
      "Place the camera at table height, slightly to the side.",
      "Show hands and face: cutlery grip, cup use, staying seated.",
      "Don’t coach more than usual — everyday behaviour is the point.",
    ],
    duration: "2–3 minutes",
  },
  imitation: {
    setup: "Face the child, knee to knee, no toys nearby.",
    tips: [
      "Model one simple gesture (clap, wave) and pause expectantly.",
      "Keep both of you in the frame — imitation lives in the timing.",
      "Repeat each gesture up to 3 times before moving on.",
    ],
    duration: "1–2 minutes",
  },
  freeplay: {
    setup: "Let the child choose the activity; you stay nearby but don’t lead.",
    tips: [
      "Film wide enough to see the whole play space.",
      "Stay quiet — narrate nothing; the camera just watches.",
      "If the child switches activities, keep filming through the transition.",
    ],
    duration: "2–3 minutes",
  },
};

// Annotation checklist (the "Response to name" protocol from the design). Each
// item carries the AI `suggest`ion — kept HIDDEN until the OT answers it
// themselves (anti-anchoring). 'kind' picks the option set.
export type AnKind = "ynp" | "attempt" | "character" | "score";
export interface AnItem {
  id: string;
  n: number;
  title: string;
  kind: AnKind;
  suggest: string;
}
export const AN_ITEMS: AnItem[] = [
  { id: "turn", n: 1, title: "Head / body turn toward the caller", kind: "ynp", suggest: "yes" },
  { id: "eye", n: 2, title: "Eye contact during the reaction", kind: "ynp", suggest: "partly" },
  { id: "attempt", n: 3, title: "First reaction appeared on attempt…", kind: "attempt", suggest: "1" },
  { id: "character", n: 4, title: "Character of the reaction", kind: "character", suggest: "full" },
  { id: "interrupt", n: 5, title: "Interrupted their ongoing activity", kind: "ynp", suggest: "no" },
  { id: "hold", n: 6, title: "Held attention after turning", kind: "ynp", suggest: "yes" },
  { id: "score", n: 7, title: "Overall response quality", kind: "score", suggest: "2" },
];

export const AN_CALLS = [
  { n: 1, at: 0.18, time: "0:12" },
  { n: 2, at: 0.44, time: "0:38" },
  { n: 3, at: 0.72, time: "1:05" },
];
export const AN_FRAMES = 18;
export const AN_SECONDS = 102;

import type { TFunc } from "../i18n/strings";

export function anOptions(kind: AnKind, t: TFunc): { value: string; label: string }[] {
  if (kind === "ynp")
    return [
      { value: "yes", label: t("annot.yes") },
      { value: "partly", label: t("annot.partly") },
      { value: "no", label: t("annot.no") },
    ];
  if (kind === "attempt")
    return [
      { value: "1", label: t("1st") },
      { value: "2", label: t("2nd") },
      { value: "3", label: t("3rd") },
      { value: "none", label: t("annot.no") },
    ];
  if (kind === "character")
    return [
      { value: "full", label: t("Full turn") },
      { value: "gaze", label: t("Gaze only") },
      { value: "none", label: t("None") },
    ];
  return [
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
  ];
}
