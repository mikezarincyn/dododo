# Processor Register & DPA Tracker — dododo Stage 1 pilot

> **DRAFT — REQUIRES HUMAN/LAWYER REVIEW AND SIGN-OFF. NOT LEGALLY EFFECTIVE.**
>
> Register of third parties that process personal data on dododo's behalf, and the
> status of their Data Processing Agreements (DPAs). Jurisdiction: UK. Children's
> video is special-category data — **any US-based processor for this data is a RISK**
> and must be replaced with a UK/EU vendor (`TODO-FOUNDER`).

## Launch gate

**No real (non-test) video may be processed until every processor that touches
personal data has a signed DPA and a confirmed UK/EU region.** Rows marked
**⛔ LAUNCH BLOCKER** below are unmet preconditions.

## Register

| # | Vendor | Role | Data processed | Region | US transfer | DPA status | Flag |
|---|---|---|---|---|---|---|---|
| 1 | **OVHcloud (UK / London)** | Hosting, compute, storage | Ephemeral **encrypted** child video; durable consent record; audit log | UK (London) | **No** | **TBD — NOT SIGNED** | ⛔ LAUNCH BLOCKER — `TODO-FOUNDER: execute OVHcloud DPA + confirm UK-region pinning before first real video` |
| 2 | DNS / TLS / edge (CDN) provider | Domain, TLS termination, routing | Connection metadata; TLS terminates here | TBD | TBD | TBD | ⛔ LAUNCH BLOCKER — `TODO-FOUNDER: identify provider; confirm UK/EU (NOT US); sign DPA. If a US CDN (e.g. typical default), flag RISK and replace.` |
| 3 | Server transcoding | — | **None** (Stage 1 uses native browser capture; no server-side transcode) | — | No | N/A | ✅ none used |
| 4 | Analytics / telemetry | — | **None** (no third-party analytics in Stage 1) | — | No | N/A | ✅ deliberately none |
| 5 | Error/crash tracking (e.g. SaaS) | — | **None** (no third-party error tracking; would risk leaking PII to a US vendor) | — | No | N/A | ✅ deliberately none |
| 6 | Email / notifications | — | **None** (delivery channel = in-app) | — | No | N/A | ✅ none used |
| 7 | ML / transcription (faster-whisper, MediaPipe, cloud ML) | — | **None in Stage 1** (`BIOMETRIC_ANALYSIS=OFF`, no cloud ML) | — | No | N/A (Stage 2) | ⚠️ `TODO-FOUNDER/LAWYER: re-do this register for Stage 2 before any ML processing` |

## US-transfer policy

- Children's special-category video must **not** be processed by a US-based vendor or
  one subject to US government access in a way that constitutes a restricted transfer.
- Any candidate US vendor → **RISK** → `TODO-FOUNDER: find a UK/EU replacement` before use.
- The application enforces a UK/EU **fail-closed** region guard in code, but this does
  **not** replace contractual DPAs — both are required.

## DPAs to sign BEFORE the first real video

1. OVHcloud (UK) — hosting/storage/compute. **Blocker.**
2. DNS/TLS/CDN provider (once identified). **Blocker.** `TODO-FOUNDER`.

## Open items

- Confirm there are no other sub-processors introduced by vendors above
  (`TODO-LAWYER: review each vendor's sub-processor list`).
- Record the controller↔processor relationship and international-transfer mechanism (if
  any) for each row — `TODO-LAWYER`.
- Re-issue this register for Stage 2 (cloud ML, stored corpus) — `TODO-FOUNDER`.
