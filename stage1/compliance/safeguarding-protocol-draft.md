# Safeguarding Protocol — dododo Stage 1 pilot (DRAFT)

> **DRAFT — REQUIRES HUMAN/LAWYER REVIEW AND SIGN-OFF. NOT LEGALLY EFFECTIVE.**
>
> Procedure for when a specialist, while reviewing a video, observes signs that a child
> may be at risk of harm. This is a **child-safety** procedure, **not** a medical or
> diagnostic one. Thresholds, the escalation channel, and statutory routing are
> `TODO-LAWYER` and must be set with a qualified safeguarding/data-protection adviser
> before launch. UK jurisdiction.

## 1. Scope and the red line

- Applies only to **child-safety concerns** (possible risk of significant harm), not to
  developmental observations, which are handled as ordinary non-diagnostic feedback.
- A safeguarding escalation is **not** a medical opinion, **not** a diagnosis, and
  **not** a screening result. It is a safety referral.
- `TODO-LAWYER: define the threshold ("reasonable cause to believe/suspect a child is
  at risk of significant harm") in line with current UK statutory guidance (e.g.
  "Working Together to Safeguard Children"). Do not infer the threshold here.`

## 2. Who escalates, to whom, how

- **Who:** the reviewing specialist (the assigned reviewer) raises the concern.
- **To whom:** a named **Designated Safeguarding Lead (DSL)**.
  `TODO-FOUNDER: name the DSL and a deputy for the pilot.`
- **Channel:** `ESCALATION_CHANNEL = TBD`. `TODO-LAWYER: define a secure, confidential
  escalation channel (not email-in-the-clear). Until set, this protocol is not
  operable.`
- **Onward referral:** the DSL decides whether to refer to local-authority children's
  social care / police / NSPCC as appropriate.
  `TODO-LAWYER: define the exact referral routing and any mandatory-reporting duties.`

## 3. What is recorded, how, and who can see it

- **What:** a **factual** safeguarding record — what was observed and when, the
  child's `display_code`/session id, the reviewer, the time (UTC), the decision and any
  referral. Written in plain, factual terms; **no diagnostic language**.
- **No reliance on the video:** because video is **no-retention** (deleted after
  review), the reviewer must **document observations contemporaneously, in writing, at
  the time of review** — the record cannot assume the video can be re-watched.
- **Access:** least-privilege — only the DSL (and deputy) can read safeguarding
  records. Stored durably, append-only, in the UK region.
  `TODO-FOUNDER: implement DSL-only access store; TODO-LAWYER: confirm access model.`
- **Retention of the safeguarding record:** `TODO-LAWYER` (likely longer than ordinary
  data; must be set deliberately, not hard-coded).

## 4. Compatibility with no-retention video

- **Default: the video is still deleted** after review per the no-retention policy.
  The safeguarding record is a **written, contemporaneous account**, not the video.
- **Exception (undecided):** whether a specific video may be **preserved** to support a
  safeguarding referral is **not decided here**. Preserving it would be an exception to
  no-retention and needs a lawful basis and a controlled, time-boxed, access-restricted
  process. `TODO-LAWYER: decide if/when a video may be preserved for safeguarding, the
  lawful basis, where it is held (UK), who may access it, and for how long. Until
  decided, default = no preservation.`
- Consent withdrawal/deletion requests interact with safeguarding duties:
  `TODO-LAWYER: confirm how an erasure/withdrawal request is handled when a
  safeguarding concern is open (safety duties may override deletion).`

## 5. After escalation

- Parent communication: `TODO-LAWYER: when and whether the parent is informed (informing
  may sometimes increase risk to the child — defer to statutory guidance and the DSL).`
- Review: every safeguarding escalation is reviewed by the DSL; lessons feed back into
  the protocol.

## 6. Sign-off (humans)

| Role | Name | Date | Signature |
|---|---|---|---|
| Designated Safeguarding Lead | _TODO-FOUNDER_ | | |
| Data protection / safeguarding lawyer | _TODO-LAWYER_ | | |
