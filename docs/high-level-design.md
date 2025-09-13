# High-Level Design — Mizuhiki SBT–Gated Privacy Pool Smart Account Wallet

This document provides the architecture and design for the MVP that targets the JSC Kaigan sponsor bounty. It complements `docs/requirements.md` by describing how the system will be built, how components interact, and why the design satisfies the hackathon criteria.

Reference: See `docs/requirements.md` for authoritative scope and acceptance criteria.

---

## 1. Objectives

- Build the simplest demonstrable, compliant privacy app that:
  - Requires Mizuhiki Verified SBT on JSC Kaigan to use the pool.
  - Enables privacy-preserving transfers via fixed-denomination privacy pool.
  - Uses a Smart Contract Account (SCA) for explicit authorization and replay protection.
  - Ships an end-to-end demo, testable by judges in minutes.

---

## 2. Architecture Overview

Components:
- Web dApp (MetaMask): Connects wallet, checks SBT, manages notes locally, runs or delegates proofs, orchestrates deposits/withdrawals.
- Smart Contract Account (SCA): Minimal single-owner account with signature + nonce enforcement; optionally a timelocked guardian for demo.
- Privacy Pool: Accepts fixed-denomination deposits, records commitments, verifies ZK proofs on withdraw, enforces SBT gating and nullifier set.
- Verifier (ZK): Groth16 verifier contract generated from Circom circuits.
- Stablecoin (ERC20): **MJPY** on Kaigan for deposits/withdrawals; address `0x115e91ef61ae86FbECa4b5637FD79C806c331632`. If contingencies arise, a minimal ERC20 demo token can be deployed as fallback.
- Network parameters: Chain ID `5278000`; native gas token **JETH**.
- Mizuhiki Verified SBT (external): ERC-721 on JSC Kaigan used for KYC gating.
- Association Set Builder: Simple off-chain worker that collects SBT-qualified deposits and maintains the Merkle tree; publishes on-chain root and off-chain JSON.
- Optional Prover Service: Local in-browser proving by default; optional lightweight node/worker fallback (no PII, proof inputs are local or encrypted in transit if used).

Interaction Summary:
1) User connects MetaMask → dApp checks SBT → if verified, user deploys/links SCA.
2) Deposit: SCA calls pool.deposit(denom, commitment), pool enforces SBT gating and records commitment.
3) After inclusion delay, user withdraws: dApp generates Groth16 proof → SCA calls pool.withdraw(proof, nullifier, recipient), pool verifies proof, checks SBT, enforces nullifier uniqueness, transfers denomination.
4) Audit View: dApp shows current association Merkle root (on-chain) and link to full set JSON (IPFS/static).

---

## 3. SBT Gating Design

Enforcement Modes (both supported; pick preferred at deploy time):
- Preferred: SCA-bound SBT — SBT is minted/bound to SCA address; pool checks `IERC721(sbt).balanceOf(msg.sender) > 0`.
- Alternative: Owner-checked — SCA exposes immutable `owner()`; pool checks `IERC721(sbt).balanceOf(SCA.owner()) > 0`.

Rules:
- Never use `tx.origin`.
- Always check SBT at call time for both deposit and withdraw.
- No admin bypass; all gates are enforced in-contract.

Trade-offs:
- SCA-bound SBT yields simpler checks and transferability of control to the SCA identity. If Mizuhiki policy can’t mint to SCAs, use owner-check fallback.

---

## 4. Smart Contracts

Contracts and Responsibilities:
- SCA (Minimal Smart Account)
  - Single owner ECDSA signer (EOA) with replay-protected `execute()`.
  - Optional guardian recovery (timelocked) for demo; not required for MVP.
  - Emits events for auditability.

- PrivacyPool
  - Token: ERC20 address for stablecoin; fixed denominations list.
  - Deposit: validates SBT, records commitment, emits Deposit(denom, commitment, ts).
  - Withdraw: validates SBT, verifies Groth16 proof against current association root, checks nullifier uniqueness, transfers denomination to recipient, emits Withdraw(nullifier, denom, ts).
  - Association root management: stores current Merkle root; updated by a role (e.g., owner/operator) or via trust-minimized flow in later iterations. For MVP, a simple operator updates root based on SBT-qualified deposits.
  - Inclusion delay: enforces block-based or timestamp-based eligibility window.

- Verifier
  - Auto-generated Groth16 verifier contract (Circom/snarkjs). Used exclusively by PrivacyPool.

- ERC20 Stablecoin (Demo)
  - Minimal token for Kaigan if an official testnet stablecoin is not available. The repo contains a sample ERC20; reuse/tweak as needed.

External:
- Mizuhiki Verified SBT — ERC-721; `balanceOf(address) > 0` indicates verified.

---

## 5. ZK Design (MVP)

Circuits (Groth16):
- Membership + Spend Circuit
  - Public inputs: association Merkle root, nullifier, denomination selector.
  - Private inputs: note secret, note commitment path, nullifier secret.
  - Constraints: commitment is in the Merkle tree; nullifier derived correctly; denomination matches note; nullifier uniqueness enforced on-chain.

Keys and Setup:
- Deterministic `demo:setup` script (circuits → powers of tau → proving key → verification key). Include instructions and caveats about trusted setup.
- Store small parameters in repo for reproducible demos; large keys may be generated on demand.

Verifier Integration:
- Deploy verifier; `PrivacyPool.withdraw()` calls `Verifier.verifyProof()` with packed public signals.

Performance:
- Optimize for small tree height and fixed denominations to keep proving fast (<~60s).

---

## 6. Data Model

- Note: `{secret, denom}` generated client-side; commitment `C = Commit(secret, denom)`.
- Merkle Tree: leaves are commitments of SBT-qualified deposits; root stored on-chain.
- Nullifier: `N = H(secret || domain)`; stored in on-chain set after spend.
- Denominations: small fixed set (e.g., 0.1, 1, 10) configured in pool.
- Association Set JSON: off-chain list of qualified commitments and metadata; pinned to IPFS or served statically for audit.

---

## 7. User Flows

Onboarding:
- Connect wallet → Check SBT → If missing, show gate screen with how-to-get instructions.
- If present, deploy/link SCA (one transaction) and proceed.

Deposit:
- Select denomination → dApp checks balance/allowance → SCA `execute()` to call `pool.deposit(denom, commitment)`.
- Client stores the note locally; offer export/import flows.

Root Update & Inclusion Delay:
- Association Set Builder updates Merkle tree and pushes new root to pool after batching windows.
- UI displays countdown until a deposit becomes eligible for withdrawal.

Withdraw/Send:
- dApp builds Merkle path, generates Groth16 proof; SCA `execute()` calls `pool.withdraw(proof, nullifier, recipient)`.
- On success, UI shows status and explorer links; warns about reusing doxxed addresses.

Audit View:
- Shows current association root (on-chain) + link to JSON; displays gate status and recent events.

---

## 8. Frontend Design

- Tech: Minimal React or vanilla TS + ethers. MetaMask only (desktop and mobile browser).
- Screens: Gate, Dashboard (SCA address, balances, denom picker), Deposit, Withdraw, Audit View, Tutorial.
- State: Persist notes locally (IndexedDB or localStorage), with export/import.
- Demo Mode: Seeded example notes and a mocked flow to ensure judges can complete demo if network is flaky.

---

## 9. Security & Privacy Considerations

- Authorization: All state changes via SCA `execute()`; signature + nonce required.
- Gating: Always enforce SBT check in deposit and withdraw; no client-only gates.
- Double-spend: Nullifier uniqueness on-chain.
- DoS bounds: Limit proof sizes; reasonable gas caps; retry UI.
- PII: None on-chain; events contain only denomination, commitment or nullifier, timestamp.
- tx.origin: Never used for auth or gating.
- Fresh addresses: UI nudges users to withdraw to fresh addresses to reduce linkability.

---

## 10. Compliance Rationale

- Regulatory compliance via KYC gating: Only Mizuhiki SBT holders can interact with the pool, preventing non-KYC usage.
- Privacy preservation: Fixed-denomination pool with ZK membership proofs obfuscates sender/receiver/amount linkages.
- Auditability: On-chain SBT checks and published association root; off-chain JSON provides transparent association set contents.
- No PII: The system never stores personal data on-chain.

---

## 11. Deployment Plan (Kaigan)

- Network: JSC Kaigan testnet (chainId `5278000`, native token **JETH**).
- Addresses: Add post-deploy (SCA template, PrivacyPool, Verifier, SBT). Stablecoin: **MJPY** `0x115e91ef61ae86FbECa4b5637FD79C806c331632`.
- Verification: Verify contracts in the Kaigan explorer; link from README.
- Config: `.env`/config.ts with RPC, chainId, addresses.

---

## 12. Testing & Demo

- Unit Tests: SBT gating (positive/negative), SCA signature/nonce auth, nullifier reuse rejection, denomination checks.
- E2E: Scripted flow Deposit → Inclusion Delay → Withdraw; ensure explorer events align.
- Demo Video (≤3 min): Show Gate, Deposit, Countdown, Withdraw, Audit View.

---

## 13. Open Questions & Decisions

- Can Mizuhiki SBT be minted/bound directly to SCA addresses? If not, default to owner-check mode.
- Availability of official Kaigan testnet stablecoin; otherwise use demo ERC20.
- Circuits stack: default Circom+snarkjs; Noir/Barretenberg is an alternative if time permits.

---

## 14. Roadmap (Post-MVP)

- Multi-denomination and dynamic fee model; yielding privacy pools.
- Merchant APIs and invoice flows; smart-account plugins.
- Advanced compliance attestations (on-request selective disclosure, off-chain attestations).
- Better anonymity set management and root updates (trust-minimized updaters, on-chain queueing).
- Mobile UX polish; deep links; account abstraction features.

---

## 15. Mapping to JSC Bounty Criteria

- Completeness (setup, end-to-end): tests + demo scripts + explorer links.
- Modern cryptography: Groth16 ZK membership proofs for privacy and nullifier correctness.
- Seamless UX: simple gates, clear states, tutorial, fresh-address guidance.
- Real-world utility: KYC-gated privacy pool addressing correlational privacy without violating compliance.
