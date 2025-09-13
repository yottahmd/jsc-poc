# Mizuhiki SBT–Gated Privacy-Pool Smart Account Wallet — Requirements Document (Authoritative)

> **This document is requirements-only, intentionally detailed so an engineer with *no prior context* can implement the MVP without ambiguity.**
>
> **Form factor:** Web dApp (desktop or mobile **browser**) + **MetaMask**. No native apps.
> **Network:** **JSC Kaigan testnet** (Ethereum-compatible).
> **Core idea:** **Only KYC’d users** (holders of **Mizuhiki Verified SBT**) can access a **Privacy Pool** through a **Smart Contract Account (SCA)** with a simple, guided UX.

---

## 0) Background (Plain-English)

### What is an SBT?

A **Soulbound Token (SBT)** is a **non-transferable NFT** (ERC-721–based) representing a wallet-bound credential (e.g., "this wallet passed eKYC"). It cannot be sold or transferred. Smart contracts can check whether a wallet holds a specific SBT **without seeing any personal data**.

### What is Mizuhiki?

**Mizuhiki** issues a **Verified SBT** to wallets that pass **electronic KYC (eKYC)**. Holding this token is a **binary proof** (yes/no) of verification. Our contracts will **require** this SBT to use private features. **No PII** is put on-chain.

### What is JSC?

**JSC** is an **EVM-compatible Layer 1**. We deploy all demo contracts to the **JSC Kaigan testnet** and use standard Ethereum tooling: Solidity, Hardhat/Foundry, MetaMask, and a block explorer.

### What is a Privacy Pool?

A **Privacy Pool** lets users **deposit** assets and later **withdraw** (or privately send) in a way that **breaks on-chain linkability** between deposit and withdrawal. Unlike ungated mixers, **only wallets with the Mizuhiki SBT** may interact. The MVP uses **fixed denominations** to simplify privacy and proofs.

### Why this MVP?

* Demonstrate **privacy & compliance** can co-exist (SBT gate + private transfers).
* Reduce **correlational privacy** risks for everyday payments.
* Provide an **end-to-end demo** judges can run in minutes.

---

## 1) Non‑Negotiable Principles (Do NOT violate)

1. **SBT Gate Always-On:** Every deposit / proof / withdraw call **must** verify that the **effective actor** holds the **Mizuhiki Verified SBT** *at call time*. Enforcement modes:
   - Preferred: the user’s **Smart Contract Account (SCA) holds the SBT** (SBT minted/bound to SCA address), so pool checks `IERC721(sbt).balanceOf(msg.sender) > 0`.
   - Alternative: SCA exposes an immutable `owner()`; pool checks `IERC721(sbt).balanceOf(SCA.owner()) > 0`.
   - Never rely on `tx.origin` for gate decisions. No backdoors. No admin bypass.
2. **No PII On-Chain:** The system records **only** the fact that SBT was required and used; **never** store names, emails, hashes of documents, etc.
3. **Smart Account Authorization:** All state-changing calls through the SCA **must** enforce **owner signature** + **nonce** (replay protection). No function may proceed without explicit authorization.
4. **Fixed Denominations:** The MVP supports **1–3 fixed amounts** (e.g., 0.1 / 1 / 10). Arbitrary amounts are out of scope.
5. **Association-Set Policy (Simple, Public):** Only SBT-holding deposits qualify. A **Merkle root** of the current set **must** be published on-chain. (Full set off-chain via JSON/IPFS is acceptable.)
6. **Client-Side Secrets:** Private **notes/commitments/receipts** are stored **locally** in the browser; export/import flows **must** be provided.
7. **Web + MetaMask Only:** No native apps. If a mobile demo is needed, it uses MetaMask mobile browser.

---

## 2) One‑Sentence Overview

A **browser wallet** for **Mizuhiki‑verified** users to make **privacy‑preserving transfers** via a **Smart Contract Account** and a **compliant Privacy Pool** on **JSC Kaigan testnet**, with clear UX and zero on‑chain PII.

---

## 3) Scope (MVP)

* **Network:** JSC Kaigan testnet only.
* **Assets:** 1 stablecoin + native gas token.
* **Denominations:** 1–3 fixed (e.g., 0.1 / 1 / 10).
* **SCA:** Single owner, signature check, nonce/replay protection; optional single‑guardian timelocked recovery (demo only).
* **Gate:** SBT required for deposit, proof, withdraw; deny otherwise.
* **Frontend:** Minimal React/Vue or vanilla JS; shows gate state, denomination picker, progress (Proving → Submitted → Finalized), and tutorial.

---

## 4) Reference Flows (Step‑by‑Step)

### 4.1 Onboarding (Wallet Connect + Gate)

**Preconditions:** User has MetaMask; optionally already holds Mizuhiki SBT on **JSC Kaigan testnet**.
**Steps:**

1. User opens dApp → clicks **Connect Wallet**.
2. dApp reads user address → **checks SBT ownership** via on-chain call.
3. If **no SBT**, show a **Gate Screen**: explain SBT, why needed, and how to obtain a test SBT (faucet/allowlist link).
4. If **has SBT**, enable **Create/Link Smart Account (SCA)** button.
5. User creates/links SCA (1 tx). On success, show SCA address and **Ready** state.

**Success Criteria:** Non-SBT users are blocked with a clear message and instructions. SBT users see SCA ready.

### 4.2 Deposit (Fixed Denomination)

**Preconditions:** SBT verified; SCA ready; user holds sufficient stablecoin and gas.
**Steps:**

1. User selects denomination (e.g., 1 unit) and clicks **Deposit**.
2. Frontend runs checks (balance, allowance).
3. Contract verifies **SBT** and **SCA signature + nonce**; then **mints a note/commitment** and emits a **Deposit event (denomination, commitment, timestamp)**.
4. Client stores the **note/secret** locally and offers **Export** (file/QR).
5. UI shows **Proving/Submitted/Finalized** progression; explorer link provided.

**Success Criteria:** Deposit finalized; note safely stored; on-chain event visible; denomination correct.

### 4.3 Private Withdraw (or Private Send)

**Preconditions:** User has a valid **note**; target is a **fresh address** (default) or another verified user.
**Steps:**

1. User clicks **Withdraw/Send** and selects denomination + destination address.
2. Client generates a **ZK proof** that the note is unspent and belongs to the allowed **association set** (SBT‑qualified deposits).
3. Contract verifies **SBT**, **proof**, **nullifier** (prevents double-spend), and **SCA signature + nonce**.
4. On success, contract transfers the denomination to the **destination**; emits **Withdraw (nullifier, denomination, timestamp)**.
5. UI updates status and advises the user **not to reuse doxxed addresses**.

**Success Criteria:** Funds arrive at destination; deposit and withdraw are not trivially linkable on-chain; nullifier prevents reuse.

---

## 5) Functional Requirements (Detailed)

### 5.1 Access Control (Mizuhiki SBT)

* **R1.** On connect, dApp calls the **Mizuhiki Verified SBT** (ERC-721 on **JSC Kaigan**) to confirm `balanceOf(subject) > 0` where `subject` is the SCA address (preferred) or `SCA.owner()`.
* **R2.** Contract methods `deposit`, `prove`, `withdraw` **require** SBT at **call time**, using the selected enforcement mode above.
* **R3.** Failure messages must be human-readable: e.g., `Access denied: Mizuhiki Verified SBT required`.

### 5.2 Smart Contract Account (Authorization)

* **R4.** All state-changing ops go through the user’s **SCA**.
* **R5.** SCA **must** verify a valid owner signature and **nonce** per call; reject otherwise.
* **R6.** No public function may change state **without** authorization.
* **R7.** (Optional demo) **Guardian recovery** is timelocked; must show a clear **Cancel** button and a countdown in UI.

### 5.3 Privacy Pool (Core)

* **R8.** **Deposit** accepts only supported denominations; mints a **commitment** and records a **nullifier** template; emits `Deposit(denomination, commitment, blockNumber/timestamp)`.
* **R9.** **Withdraw/Send** verifies: (a) valid ZK proof of membership in the **SBT‑qualified association set**, (b) **nullifier** not seen before, (c) **SBT** still held by caller, (d) **SCA auth**. Emits `Withdraw(nullifier, denomination, blockNumber/timestamp)`.
* **R10.** **Association set policy** (MVP): include **only** SBT‑qualified deposits; publish the **Merkle root** on-chain (readable function); provide a JSON of the full set via IPFS or public endpoint.
* **R11.** **Inclusion delay (MVP):** newly made deposits become eligible after a short delay window (e.g., 10–30 blocks) to allow batch privacy. Display countdown in UI.
* **R12.** **Amount privacy:** only denomination is visible on-chain; arbitrary amounts are out of scope.

### 5.4 Client (Web + MetaMask)

* **R13.** Works in Chrome/Brave/MetaMask mobile browser; no native install.
* **R14.** Stores **notes/commitments** locally; provides **Export/Import** (file or copyable string).
* **R15.** Provides a **Demo Mode** with seeded parameters for reproducible judging.

### 5.5 UX & Copy (Canonical)

* **Deposit button copy:** `Deposit {denomination}`; warning: `Keep your deposit note safe. It is required to withdraw.`
* **Withdraw button copy:** `Withdraw to fresh address (recommended)`; tooltip: `Withdrawing to a doxxed address reduces privacy.`
* **Gate message:** `Access requires a Mizuhiki Verified SBT. No personal data is stored on-chain.`
* **Errors:** `Missing SBT`, `Insufficient balance`, `Invalid denomination`, `Proof failed`, `Duplicate nullifier`.

### 5.6 Compliance & Auditability

* **R16.** Publicly verifiable **SBT checks** and **association root** published on-chain.
* **R17.** Provide a **Compliance Note**: optional selective disclosure path (e.g., signed attestation from the SBT issuer) **off-chain**, on request only.
* **R18.** Provide a short **Threat Model** in the repo: what is protected (linkability/amount privacy) vs not (global timing analysis).

### 5.7 ZK Proof System (MVP)

* **Z1.** Use **Groth16** membership circuits (e.g., Circom + snarkjs) for simplicity and speed; ship proving/verifying keys under a reproducible setup script.
* **Z2.** Circuits cover: (a) inclusion of `commitment` in the published **association Merkle root**, (b) correctness of **nullifier** from secret, (c) denomination consistency.
* **Z3.** Deploy the generated **Verifier** contract and integrate with the pool’s `withdraw` proof verification.
* **Z4.** Provide a `demo:setup` script that re-generates parameters deterministically for judges; include guidance about trusted setup caveats in README.

---

## 6) Security Requirements (Pitfalls to Avoid)

* **S1.** **Never** process a state change without SCA **signature + nonce**. (Common failure → funds theft.)
* **S2.** **Always** check SBT at call time; do not cache the result client-side.
* **S3.** **Prevent double-spend** with a unique **nullifier** per note; store nullifiers on-chain.
* **S4.** **DoS bounds:** limit proof sizes, on-chain verification gas, and queue lengths; provide retries with backoff.
* **S5.** **No PII** anywhere on-chain; do not log addresses linked to real identities beyond normal blockchain data.
* **S6.** **Event hygiene:** emit only necessary data (denomination, commitment/nullifier, timestamps); avoid leaking linking hints.
* **S7.** **Never use `tx.origin`** for any authorization or SBT checks; rely on explicit SCA signer/owner references.

---

## 7) Performance & Reliability Targets

* **P1.** Proof generation ≤ \~60s on a typical laptop, or provide a **hosted prover** fallback.
* **P2.** End-to-end private flow (deposit → withdraw) ≤ \~3–5 minutes on testnet confirmations.
* **P3.** Deterministic demo mode with seeded inputs for judges.

---

## 8) Interoperability & Extensibility

* **I1.** Support at least **one testnet stablecoin** on **JSC Kaigan**. If unavailable, deploy a minimal ERC20 test stablecoin for the demo.
* **I2.** Clear path to add denominations/assets later (config-driven).
* **I3.** Abstract SBT check to support alternative compliant ID tokens in future.

---

## 9) Assumptions & Constraints

* Mizuhiki Verified SBT is deployed on **JSC Kaigan testnet** and queryable via ERC‑721 `balanceOf`.
* Test users can receive SBTs (faucet/allowlist) before judging.
* Privacy depends on **anonymity set**; run **mixer windows** during the demo to aggregate deposits.

---

## 10) Out of Scope (MVP)

* Native mobile apps.
* Cross-chain bridges.
* Arbitrary amounts; complex DeFi integrations.
* Production-grade recovery/custody.

---

## 11) Acceptance Criteria (Demonstrable)

* **A1. Gate works:** Non‑SBT wallet is blocked with guidance; SBT wallet proceeds.
* **A2. SCA auth:** Removing signature/nonce checks causes a failing test; with checks, calls succeed.
* **A3. Deposit OK:** On-chain `Deposit` event (denomination, commitment) visible; client holds note.
* **A4. Withdraw OK:** On-chain `Withdraw` event (nullifier, denomination); recipient receives funds; nullifier cannot be reused.
* **A5. UX clarity:** States (Proving → Submitted → Finalized), helpful errors, and a 60–90s tutorial.
* **A6. Audit view:** A simple page displays current **association Merkle root** and confirms SBT-gated methods.

---

## 12) Success Metrics (Hackathon)

* **M1.** Judge completes the scripted demo without assistance.
* **M2.** Non‑SBT wallets cannot perform pool actions.
* **M3.** On-chain analysis cannot trivially link a deposit to a withdrawal (fixed-denom + fresh address).
* **M4.** README documents compliance posture and privacy limits clearly.

---

## 13) Submission Checklist (Must‑Have Artifacts)

* ✅ Public repo (MIT/Apache), clean structure.
* ✅ **README**: one‑sentence summary, how **Mizuhiki Verified SBT** is used, quickstart, setup & testing instructions, **demo script**, threat model, compliance note, known limits, **next steps**.
* ✅ **Live demo** on **JSC Kaigan testnet** or reproducible local script; **E2E test** covering A1–A5.
* ✅ **Short demo video** (≤3 min preferred) showing the happy path + gate behavior, or slide deck.
* ✅ **Deployed contract addresses** (testnet), verified in explorer.
* ✅ **Association set root** publication method and sample JSON (IPFS link or static file).
* ✅ **Team Summary**: short description of each member and role.
* ✅ **Network config**: chainId and RPC for **JSC Kaigan**, explorer links.
* ✅ Future work roadmap (mobile app, more denoms, merchant API, yielding pools, ticketing integration).

---

## 13.1) Hackathon Compliance Mapping (JSC Bounty)

- ✔ Uses **Mizuhiki Verified SBT** on **JSC Kaigan testnet** for gating (Sections 1, 5.1).
- ✔ Implements a **privacy‑preserving DeFi** primitive (privacy pool with ZK proofs) with compliance gate (Sections 4–5).
- ✔ Submission artifacts align with sponsor requirements (Section 13), incl. README items, video, and team summary.
- ✔ Focus on **UX** (Section 5.5), **modern cryptography** (Section 5.7), **completeness** (Sections 11–12), and **real‑world utility** (Background + README Compliance Note).

---

## 14) Demo Script (For Judges)

1. Connect wallet (MetaMask) → Gate screen appears if no SBT; otherwise proceed.
2. Create SCA (1 tx) → UI shows SCA address.
3. Deposit 1 unit → store note; show `Deposit` event link in explorer.
4. Wait inclusion delay window (UI countdown).
5. Withdraw to a fresh address → show `Withdraw` event; balance appears at destination.
6. Open **Audit View** → shows current association root and SBT‑gate status.

---

## 15) Glossary

* **SBT:** Non-transferable ERC‑721 credential (here: eKYC verified).
* **Mizuhiki:** The eKYC program issuing the Verified SBT.
* **SCA:** Smart Contract Account controlling user actions with signature + nonce.
* **Association Set:** The eligible deposit set for proofs (SBT‑qualified only).
* **Commitment/Note/Nullifier:** Cryptographic artifacts enabling private spend and double‑spend prevention.

---

### TL;DR for Judges

**Only Mizuhiki‑verified users** can access a **Privacy Pool** on **JSC Kaigan** through a **Smart Contract Account** in a **browser + MetaMask** dApp. The MVP uses **fixed denominations**, publishes the **association set root** on‑chain, stores **notes client‑side**, and demonstrates **private withdraws** without on‑chain PII.
