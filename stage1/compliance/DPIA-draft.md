# Data Protection Impact Assessment — dododo Stage 1 pilot

> **DRAFT — REQUIRES HUMAN/LAWYER REVIEW AND SIGN-OFF. NOT LEGALLY EFFECTIVE.**
>
> This document was drafted by an engineering assistant to reflect the implemented
> system and the agreed session parameters. It is **not legal advice** and is **not a
> completed DPIA**. Every `TODO-LAWYER` marks a determination that must be made by a
> qualified data protection lawyer / DPO before launch.

## 0. Session parameters (as built)

| Parameter | Value |
|---|---|
| Jurisdiction | UK |
| Video retention | **NONE** (deleted after specialist review) |
| Provider region | UK (London) |
| Provider compute | OVHcloud-UK |
| Biometric / automated analysis | **OFF** (manual review only, no ML) |
| Delivery channel | in-app |
| Escalation channel | TBD-LAWYER |
| Consent-record retention | TBD-LAWYER |
| Cohort | 15–25 UK families, children ~12–36 months, recruited directly |

## 1. Purpose of processing

A parent/guardian voluntarily records or uploads a short everyday video of their
child. A human specialist reviews the video and returns **general, non-diagnostic
observations and feedback** to support the family. There is **no automated/ML
analysis** and **no diagnosis** (the product is deliberately not a medical device —
see red-line statement in §8).

## 2. Data subjects and data categories

- **Data subjects:** the child (primary) and the parent/guardian (consent-giver).
- **Categories:**
  - The **video** of the child. Treated as **special-category data** as a precaution
    (it may reveal information about a child's health/development) and because it
    concerns a **vulnerable data subject (a young child)**.
    `TODO-LAWYER: confirm the correct classification of the video under UK GDPR Art 9
    and whether any footage attributes change it.`
  - **Consent record** (metadata): checked consent checkbox ids, UTC timestamp,
    consent_version, jurisdiction, session id, region. Contains **no real name**.
  - **Pseudonymous identifiers:** child/session/submission ids are UUID4; the only
    human-facing label is an auto-generated `display_code` (e.g. `CH-XXXXXX`).
  - **Specialist feedback** (free-text observations about the child).
  - **Access/audit log** (actor, video id, action, UTC timestamp — no PII).
- **Minimisation:** real names are **never** collected or stored; provenance uses a
  `source_sha256` hash, never the original file name.

## 3. Necessity and proportionality

- Video is the minimum needed for a specialist to give meaningful observations.
- It is held only as long as needed to review it, then deleted (no-retention).
- No secondary use: no training corpus, no analytics, no profiling (Stage 1).
  `TODO-LAWYER: confirm necessity/proportionality assessment is adequate for a
  special-category, children's-data pilot of this size.`

## 4. Lawful basis (UK GDPR)

- **Intended basis:** explicit consent of the holder of parental responsibility,
  captured as four separate, unticked, mandatory checkboxes (see Privacy Notice and
  the consent flow). Parent verification in Stage 1 is **self-attestation**.
- `TODO-LAWYER: confirm (a) Article 6 lawful basis; (b) the Article 9(2) condition for
  special-category data (explicit consent assumed); (c) that self-attestation of
  parental responsibility constitutes adequate "reasonable efforts" to verify
  verifiable parental consent for a pilot of ≤30 families; (d) age/competence
  considerations for the child.`

## 5. Data flow

1. Parent gives explicit consent in-app (consent record stored durably, UK region).
2. Parent captures/uploads a video via the device's native file picker
   (`<input type="file" accept="video/*" capture>`; no live camera overlay).
3. Video is transmitted over TLS and stored **encrypted at rest** (AES-256-GCM) in an
   **ephemeral** location in the UK region only.
4. An **assigned** specialist views it in-console (decrypt-on-view); no download.
5. Specialist saves observations; **video bytes are purged immediately** after review.
6. Unreviewed/abandoned videos are purged by a TTL sweeper.
7. Surviving data: consent record, minimal submission tombstone, feedback, audit log.

## 6. Retention

See `retention-policy-draft.md`. Summary: video = none; consent record, feedback and
audit-log retention periods are **TBD-LAWYER** and must not be hard-coded until set.

## 7. Security measures (implemented)

- **In transit:** TLS enforced (http→https redirect + HSTS); camera requires HTTPS.
- **At rest:** AES-256-GCM per-file (random nonce, AAD bound to submission id).
- **Residency:** all storage roots in UK region; the storage facade is **fail-closed**
  — it refuses to process data if the configured region is `TBD` or not in a UK/EU
  allow-list, so **no US transfer** is possible by code.
- **Access control:** least-privilege roles (reviewer/admin); **need-to-know** — a
  video is viewable only by the assigned reviewer; admins cannot view video.
- **No download:** video served inline only; no download endpoint/affordance.
- **Auditability:** append-only access log (actor, video id, action, UTC time); not
  editable/deletable from the application.
- **File permissions:** directories `0o700`, files `0o600`.
- **Data minimisation / pseudonymisation:** UUIDs + `display_code`; no names; hash
  provenance.
- **No biometric/ML processing** in Stage 1.

## 8. Red line (non-negotiable)

dododo provides **observations and feedback**, not a medical device, not a diagnosis,
and not a screening result. UI language is constrained by an automated lint that bans
diagnostic terms. This is load-bearing to keep the product outside MDR/SaMD and **must
not be weakened**.

## 9. Risks and mitigations

| # | Risk | Likelihood/impact | Mitigation (implemented) | Residual |
|---|---|---|---|---|
| R1 | Unauthorised access to a child's video | High impact | At-rest encryption; least-privilege + need-to-know; no download; audit log | `TODO-LAWYER: assess residual acceptability` |
| R2 | Data leaves UK / unlawful transfer | High impact | UK-only roots; fail-closed region guard; no US vendors (see P7) | Depends on vendor DPAs (P7) |
| R3 | Video retained longer than needed | Med | Purge after review + TTL sweeper for abandoned | Confirm TTL hard cap — TODO-FOUNDER |
| R4 | Re-identification via stored metadata | Med | No names; UUID + display_code; hash not filename | `TODO-LAWYER` |
| R5 | Consent given by non-guardian | Med/High | Explicit self-attestation checkbox; withdrawal before review | `TODO-LAWYER: sufficiency of self-attestation` |
| R6 | Reviewer screen-records/exfiltrates video | Med | Need-to-know, no download, audit, controlsList=nodownload | Web cannot fully prevent screen capture — `TODO-LAWYER` policy/contractual control |
| R7 | Safeguarding disclosure obligations vs no-retention | High | Safeguarding protocol (P8); contemporaneous written record | `TODO-LAWYER` (see P8) |
| R8 | Personal-data breach | High impact | Encryption, minimisation, access control, logging | Breach-response plan — `TODO-LAWYER` |
| R9 | Children as vulnerable subjects | — | Minimisation; non-diagnostic framing; plain-language notice | `TODO-LAWYER`: children's-data specific safeguards / ICO Children's Code applicability |

## 10. Open items requiring legal sign-off

- Controller/processor identity and DPO contact — `TODO-LAWYER`.
- Article 6 + Article 9 conditions — `TODO-LAWYER`.
- Verifiable parental consent sufficiency — `TODO-LAWYER`.
- Retention periods (consent record, feedback, audit log) — `TODO-LAWYER`.
- Applicability of the ICO Age-Appropriate Design (Children's) Code — `TODO-LAWYER`.
- Whether a video may ever be preserved for safeguarding (exception to no-retention) — `TODO-LAWYER` (P8).
- DPIA consultation with ICO if high risk cannot be mitigated — `TODO-LAWYER`.

## 11. Sign-off (to be completed by humans)

| Role | Name | Date | Signature |
|---|---|---|---|
| Data Protection Officer / lawyer | _TODO_ | | |
| Product owner / founder | _TODO_ | | |
