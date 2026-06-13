# Data Retention Policy — dododo Stage 1 pilot

> **DRAFT — REQUIRES HUMAN/LAWYER REVIEW AND SIGN-OFF. NOT LEGALLY EFFECTIVE.**
>
> Reflects the implemented system and session parameters. Periods marked
> `TODO-LAWYER` are **not** set and **must not be hard-coded** until a lawyer fixes
> them. Jurisdiction: UK. Region: UK (London), OVHcloud-UK.

## Principle

Children's video is the most sensitive asset. Stage 1 runs **no-retention**: a video
exists only long enough for one assigned specialist to review it, then it is deleted.
The only data designed to survive long-term is the **consent record** and a minimal
audit log.

## Retention schedule

| Data | Retention | Trigger to delete | Implemented control | Status |
|---|---|---|---|---|
| **Video bytes** (child) | **NONE** | Immediately after specialist marks the review complete | `mark_reviewed_and_purge` deletes encrypted bytes; `delete` for erasure requests | ✅ enforced in code |
| **Abandoned video** (never reviewed) | Hard cap, then purged | TTL sweeper | `purge_abandoned_videos` using `ABANDONED_VIDEO_TTL_HOURS` (default 7 days) | ⚠️ `TODO-FOUNDER: confirm the hard-cap number; current default is provisional` |
| **Consent record** (metadata only) | = `CONSENT_RECORD_RETENTION` | Auto-purge once a period is configured | `purge_expired_consent` is a **no-op while the period is unset** (no hard-coded number) | ⛔ `TODO-LAWYER: set the consent-record retention period (low risk, but the number is a legal decision)` |
| **Specialist feedback** (observations text) | TBD | On erasure request, or per period once set | Deleted on `delete`; otherwise retained to deliver to the parent | ⛔ `TODO-LAWYER: set feedback retention; confirm it is deletable on request` |
| **Access / audit log** (actor, video id, action, UTC time; no PII) | TBD | Per period once set | Append-only JSONL; not editable/deletable from the app | ⛔ `TODO-LAWYER: set audit-log retention; balance accountability vs minimisation` |
| **Derived frames / ML artefacts** | N/A Stage 1 | — | None produced (no ML, `BIOMETRIC_ANALYSIS=OFF`) | ✅ none exist |

## Notes

- **No-retention is structural:** even on logic failure, video lives in an ephemeral
  store outside the durable data directory, and the encryption key may be process-only
  (so a restart renders bytes unrecoverable). This is intentional defence-in-depth.
- **Consent survives video deletion:** the consent record contains no real name and is
  the evidence that consent was given for a deleted video.
- **Right to erasure / withdrawal:** withdrawing consent before review deletes the
  video; an erasure request deletes video **and** related feedback. A pseudonymous
  tombstone may remain to confirm deletion happened. `TODO-LAWYER: confirm the
  tombstone is acceptable and what it may contain.`
- **Safeguarding exception:** whether any video may ever be preserved beyond review for
  a safeguarding concern is **not decided** — default is no-retention; see
  `safeguarding-protocol-draft.md`. `TODO-LAWYER`.

## Review

This policy must be reviewed and signed before the first real video is processed, and
re-reviewed before any move to Stage 2 (cloud ML / stored corpus).
