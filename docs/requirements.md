# Mizuhiki SBT–Gated Privacy-Pool Smart Account Wallet — Requirements Document

**Scope:** Product requirements (not implementation).
**Form factor:** Web dApp (desktop or mobile browser) + MetaMask only. No native apps.
**Goal:** The simplest viable MVP for a hackathon submission that demonstrates **compliance + privacy** working together end-to-end.

---

## 0) Background

### What is an SBT?

A **Soulbound Token (SBT)** is a **non-transferable NFT** (typically built on ERC-721) that represents an attribute or credential bound to a wallet (e.g., “this wallet passed eKYC”). It **cannot be sold or transferred**, so it can serve as an identity credential on-chain **without revealing personal information**.

### What is Mizuhiki?

**Mizuhiki** issues a **Verified SBT** to wallets that pass **electronic KYC** (eKYC). Holding this SBT is a **binary proof of verification**—on-chain contracts can check *“does this wallet hold the verified SBT?”* without exposing PII. This enables **compliance-gated access** to features while keeping user privacy.

### What is JSC?

**JSC** is an **Ethereum-compatible Layer-1 blockchain** (EVM). For this project, JSC is the **target network** where:

* The Mizuhiki Verified SBT is issued, and
* Our privacy-preserving wallet + privacy pool contracts are deployed.
  Because JSC is EVM-compatible, we can use standard Ethereum tools (Solidity, Hardhat, MetaMask, block explorers).

### What is a Privacy Pool?

A **Privacy Pool** is an on-chain system that lets users **deposit** assets and later **withdraw** them in a way that **breaks the public link** between deposit and withdrawal. Unlike ungated “mixers,” this pool **requires the Mizuhiki SBT** to participate (compliance gate). Cryptography (e.g., zero-knowledge proofs) hides who sent what to whom (and in many designs, hides amounts via **fixed denominations**), while still enforcing that **only verified users** can use the system.

### Why build this? (Purpose of the MVP)

* Demonstrate **privacy-preserving transactions** that are also **regulatory-friendly**.
* Reduce **correlational privacy risk** in everyday payments (e.g., a cashier doxxing your main wallet).
* Provide an **end-to-end demo** that judges can run: onboarding → private transfer → withdrawal, with clear UX and guardrails.

---

## 1) One-Sentence Overview

A **web wallet** that lets **KYC’d users** (holders of **Mizuhiki Verified SBT**) perform **privacy-preserving transfers** via a **Smart Contract Account (SCA)** and a **compliant Privacy Pool** on **JSC**—all through a familiar **browser + MetaMask** experience.

---

## 2) Goals (What Success Looks Like)

* **Compliance-gated access:** Only wallets holding the Mizuhiki SBT can deposit, transfer, or withdraw from the Privacy Pool.
* **Practical privacy:** Obfuscate sender/receiver linkability and amounts (via denominations) for casual observers/analytics.
* **Dead-simple UX:** One-click flows; human-readable confirmations; no crypto jargon required.
* **Hackathon-ready:** Reliable scripted demo judges can reproduce end-to-end in minutes.

---

## 3) Non-Goals (Out of Scope for MVP)

* Ungated anonymity tools or mixers without compliance.
* Nation-state-grade privacy guarantees (we focus on practical correlational privacy).
* Production-grade key management/custody/recovery.
* **Native iOS/Android apps** (browser + MetaMask only for MVP).
* Cross-chain functionality.

---

## 4) Personas

* **KYC’d User:** Wants to pay or transfer without exposing their primary wallet history.
* **Merchant/Counterparty:** Wants frictionless receipt without learning the payer’s main address.
* **Compliance Reviewer (optional role in docs):** Needs assurance that only verified users can access the privacy feature; does **not** need PII.

---

## 5) Core User Stories

1. **Gate on connect:** As a user, when I connect my wallet, the dApp verifies I hold a **Mizuhiki Verified SBT** before enabling private features.
2. **Smart account upgrade:** I can create/upgrade to a **Smart Contract Account (SCA)** bound to my wallet for secure operations.
3. **Private deposit:** I can **deposit** supported assets into the **Privacy Pool** with a simple **fixed-denomination** choice.
4. **Private transfer/withdraw:** I can **privately send** to another verified user or **withdraw** to a fresh address, breaking linkability.
5. **Clarity & control:** I see readable steps, estimates, and can simulate before submitting.
6. **Verification view (judging aid):** A simple page shows that **all pool interactions are SBT-gated** (no PII).

---

## 6) MVP Scope (Small but Complete)

* **Network:** JSC testnet (or a single designated test network for judging).
* **Assets:** 1 stablecoin + native gas token.
* **Privacy Pool:** 1–3 **fixed denominations** (e.g., 0.1 / 1 / 10 unit).
* **SCA:** Basic owner-signature checks + nonce/replay protection. Optional: single-guardian “demo recovery.”
* **Gating:** Deposit / proof / withdraw **require current SBT ownership**.
* **Frontend:** Minimal web UI with clear gate status, privacy indicators, and a 60–90s tutorial.

---

## 7) Functional Requirements

### 7.1 Access Control (Mizuhiki SBT)

* **R1.** On wallet connect, the app checks **SBT ownership**; non-holders see a friendly gate with instructions.
* **R2.** **All** privacy-pool operations (deposit, proof gen, withdraw/transfer) **hard-require** SBT at call time.
* **R3.** On-chain contracts rely only on **binary SBT checks**; **no PII** is logged on-chain.

### 7.2 Smart Contract Account (SCA)

* **R4.** Users can **instantiate or link** an SCA controlled by their EOA; sensitive ops route via the SCA.
* **R5.** SCA enforces **owner signature** and **nonce/replay protection** for every state-changing call.
* **R6.** (Optional, demo-grade) Single **guardian recovery** with **timelock + cancel** UX, clearly labeled as experimental.

### 7.3 Privacy Pool

* **R7.** **Deposit** into the pool with fixed denominations; client receives a **private note/receipt**.
* **R8.** **Withdraw or transfer** in a way that **breaks linkability** between deposit and destination address.
* **R9.** Enforce **KYC-only membership** via the SBT gate for **every** pool interaction.
* **R10.** Provide **proof generation** with progress feedback (in-browser or hosted prover) and clear success/failure.
* **R11.** Default to **withdrawing to a fresh address**; warn users about doxxed destinations.
* **R12.** **Amount privacy**: on-chain events do not reveal arbitrary amounts—only the chosen denomination.

### 7.4 Compliance & Auditability

* **R13.** Publicly verifiable **contract guards** prove that only SBT holders can interact.
* **R14.** Document an **optional disclosure path** (e.g., a signed attestation that the user held SBT at interaction time) **without revealing counterparties or PII**.
* **R15.** Provide a concise **threat model** (what is and isn’t protected), included in submission docs.

### 7.5 UX & Safety

* **R16.** One-click flows (Deposit / Private Send / Withdraw) with visible states: **Pending → Proving → Submitted → Finalized**.
* **R17.** **Safety interlocks:** explicit confirmations for risky actions; always display SBT-gate status; **simulate** where possible.
* **R18.** Friendly **error messages** for: missing SBT, insufficient funds, wrong denomination, proof failures, gas issues.
* **R19.** An **onboarding tutorial** (60–90s) explaining: SBT gate, what privacy protects, and its limits.

---

## 8) Security & Privacy Requirements

* **R20.** **Non-custodial**: Contracts never take unilateral control of user funds.
* **R21.** **Mandatory signature checks** for SCA; no state change without valid authorization.
* **R22.** **Least privilege**: minimal public methods; explicit allowlists if cross-contract calls exist.
* **R23.** **No PII on-chain**. SBT is a binary gate; actual identity data stays off-chain with the issuer.
* **R24.** **Note/commitment handling** remains client-side; export/import provided for the demo.
* **R25.** **DoS boundaries**: cap proof sizes, gas usage, and retries; provide clear fallback messages.

---

## 9) Performance & Reliability (MVP Targets)

* **R26.** Proof generation completes in a **reasonable demo time** (≈ ≤60s on a typical laptop) or uses a **hosted prover fallback**.
* **R27.** End-to-end private transfer (deposit → send/withdraw) finishes within **\~3–5 minutes** on testnet including confirmations.
* **R28.** The UI offers a **deterministic demo mode** (seeded parameters) so judges can reproduce results.

---

## 10) Interoperability & Extensibility

* **R29.** Support at least **one testnet stablecoin** on JSC.
* **R30.** Clear path to add **more denominations** and additional assets later.
* **R31.** Abstract the **SBT gate** so other compliant identity tokens could be supported with configuration.

---

## 11) Assumptions & Constraints

* The Mizuhiki Verified SBT is **available on the chosen JSC testnet** and **queryable on-chain**.
* Test users obtain SBTs beforehand (allowlist/faucet for judging).
* Privacy strength depends on the **anonymity set**; for judging, we may simulate activity or use a test cohort.

---

## 12) Out of Scope (MVP)

* **Native mobile apps** (Web + MetaMask only).
* Cross-chain bridges and multi-network routing.
* Unlimited denominations or complex DeFi integrations.
* Production-grade account recovery or enterprise key management.

---

## 13) Success Metrics (for Hackathon)

* **M1.** A judge completes the scripted demo—**without assistance**—from onboarding to private withdraw.
* **M2.** Non-SBT wallets are **blocked** from all privacy-pool operations.
* **M3.** On-chain activity shows pool usage **without trivially linking** deposit and withdrawal addresses.
* **M4.** Submission docs clearly explain **compliance gating** and **privacy limits**.

---

## 14) Acceptance Criteria (What We Will Demonstrate)

* **A1.** **Gated access works:** Non-SBT wallet is stopped; SBT wallet proceeds.
* **A2.** **SCA is used** with signature + nonce checks; removing the check causes a failing test (documented).
* **A3.** **Deposit** succeeds and yields a **private note** to the client.
* **A4.** **Private send/withdraw** succeeds; recipient can spend funds.
* **A5.** **UI/UX** shows clear states, human-readable errors, and a short tutorial.
* **A6.** **Threat model & compliance note** included in the repo.

---

## 15) Hackathon Submission Checklist (Must-Have)

* ✅ **Public repo** (MIT/Apache), clean folder structure.
* ✅ **README** with: overview, quickstart, **demo script**, known limits, **threat model**, and compliance posture.
* ✅ **Live demo** on JSC testnet or a reproducible local script; **end-to-end test** covering A1–A5.
* ✅ **Short demo video** (≤3–5 min) showing the happy path and SBT gate behavior.
* ✅ **Deployed contract addresses** (testnet), verified in explorer where possible.
* ✅ **Privacy & Compliance section** (what is hidden, what is not; SBT gate rationale).
* ✅ **Future work** roadmap (e.g., mobile app later, more denominations, merchant APIs, yielding pools, ticketing integration).

> **Judging Criteria Mapping (from prompt):**
> • Completeness (setup, end-to-end) **20%** → Covered by A1–A5, M1, checklist items.
> • Modern crypto (ZK/FHE) **20%** → Privacy Pool proofs + denomination design.
> • Seamless UX **40%** → One-click flows, tutorial, simulation, readable states/errors.
> • Real-world utility **20%** → Compliance gate (SBT) + practical privacy for payments/payroll/DeFi.

---

## 16) Risks & Mitigations (Summary)

* **Low anonymity set:** Provide scheduled “mixer windows,” seed demo users, and guidance to batch actions.
* **User error (wrong denom/addr):** Strong confirmations, simulations, clipboard/domain warnings, test “dry-run” mode.
* **Key loss:** Minimal demo guardian recovery or explicit disclaimer in docs.
* **Regulatory ambiguity:** Emphasize **SBT-gated access** and **no PII on-chain**; include compliance notes.
* **Performance hiccups (proof time):** Hosted prover fallback + progress UI.

---

## 17) Documentation Deliverables

* This **Requirements Document** (self-contained, no prior context needed).
* **README** with setup/run and demo script for judges.
* **Threat Model & Compliance Note** (1–2 pages).
* **Contract addresses + ABIs** (testnet), verification links.
* **Short demo video** walkthrough.

---

### TL;DR for Judges

This MVP shows a **browser-based wallet** where only **Mizuhiki-verified** users can access a **Privacy Pool** on **JSC** through a **Smart Contract Account**, enabling **compliance-friendly private transfers** with simple UX and no PII on-chain.
