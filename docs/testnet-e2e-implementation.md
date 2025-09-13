# Testnet E2E Implementation Plan (Kaigan)

Goal: Run a full end‑to‑end private flow (deposit → publish root → withdraw) on JSC Kaigan using MJPY and Mizuhiki SBT, with Smart Contract Accounts and a real Groth16 verifier.

This document lists the remaining work to bridge from current repo to a complete testnet demo judges can run.

---

## 1) Contracts — Finalization

- PrivacyPool
  - Enforce SBT on SCA owner (immutable):
    - `IERC721(sbt).balanceOf(SCA.owner()) > 0` at call time.
- (Optional) Strict recipient mode (immutable flag): if enabled, require `IERC721(sbt).balanceOf(recipient) > 0` on withdraw. Default OFF.
  - Keep current: fixed denominations, nullifier set, root + inclusion delay, events.
- SmartAccount
  - Keep minimal EIP‑712 execute with `nonce` and `chainId` checks.
  - Optional: add `executeBatch` (low priority for MVP).

Acceptance
- Unit deploy on Kaigan; basic calls succeed; gate rejects non‑SBT calls.

---

## 2) ZK Verifier Integration

- Circuits (separate repo or folder)
  - Membership + Nullifier circuit using Poseidon/MiMC for note and Merkle.
  - Public signals (canonical order): `[root, nullifier, denomIndex]`.
  - Generate proving/verifying keys.
- Verifier
  - Deploy the generated Groth16 verifier (Circom + snarkjs).
  - If signature differs, add a VerifierAdapter to implement `IVerifierGroth16.verifyProof(bytes proof, uint256[] publicSignals)`.
- Client/CLI
  - Provide JSON schema for inputs and resulting `proof` + `publicSignals` to feed into `withdraw`.

Acceptance
- A sample proof verifies off-chain and on-chain against a published root.

---

## 3) Association Set Builder (Off‑Chain)

- Responsibilities
  - Scan PrivacyPool `Deposit(denomination, commitment, timestamp)` events.
  - Build/maintain Merkle tree (same hash as the circuit, e.g., Poseidon) with a fixed height.
  - Recompute and publish root via `publishAssociationRoot(root)` after batching window.
  - Pin JSON snapshot of the set to IPFS (optional, but recommended for transparency).
- Implementation
  - Node.js script/service using ethers + circomlibjs (Poseidon) or equivalent library.
  - Config: RPC URL, pool address, tree height, batching interval.

Acceptance
- Builder computes the same root as the circuit and publishes it; UI/CLI can read it.

---

## 4) SCA Exec CLI (EIP‑712)

- Purpose
  - Sign EIP‑712 `ExecRequest` with OWNER private key and send `SmartAccount.execute` for:
    - ERC20 `approve(Pool, denom)`
    - PrivacyPool `deposit(denom, commitment)`
    - PrivacyPool `withdraw(denom, recipient, root, nullifier, proof, publicSignals)`
- Design
  - Script `scripts/sca-exec.ts` with subcommands: `approve`, `deposit`, `withdraw`.
  - Inputs via flags or JSON file; outputs tx hash + explorer link.
  - Uses domain `MizuSCA` v1 and current `chainId`.

Acceptance
- One command each successfully executes approve, deposit, and withdraw on Kaigan.

---

## 5) Operational Runbook (Judge-Friendly)

- Prereqs
  - JETH for gas (faucet or sponsor funds) in deployer wallet.
  - MJPY in the SCA (transfer from deployer or sponsor faucet).
- Mizuhiki SBT held by SCA.owner() (policy: SBTs are not minted to SCAs).
- Steps
  1) Deploy SCA and record address.
  2) Fund SCA with MJPY.
  3) Deploy Verifier (real Groth16) and record address.
  4) Deploy PrivacyPool with MJPY, SBT, Verifier, denominations, inclusion delay, and enforcement flags.
  5) Approve MJPY and deposit one denomination via SCA Exec.
  6) Wait for builder to publish root; confirm inclusion delay elapses.
  7) Generate proof for withdraw; run SCA Exec to withdraw to a fresh, SBT‑holding recipient.
  8) Verify events and balances on RouteScan.

Acceptance
- End‑to‑end completes within 3–5 minutes once root is published; no manual debugging required.

---

## 6) Addresses and Config (Kaigan)

- Network: Kaigan (chainId `5278000`, native `JETH`)
- MJPY: `0x115e91ef61ae86FbECa4b5637FD79C806c331632`
- Mizuhiki SBT: `0x606F72657e72cd1218444C69eF9D366c62C54978`
- RouteScan Explorer: https://testnet.routescan.io/

---

## 7) Risks and Mitigations

- SBT cannot be minted to SCA → We always enforce on `owner()`.
- Prover instability → Pre‑generate proof for demo note; keep small circuits; provide clear retries.
- Thin anonymity set → Pre‑seed deposits in each denomination; run batching windows.
- RPC instability → Keep manual publish‑root fallback; provide explorer links.

---

## 8) Deliverables Checklist

- Contracts
  - [ ] PrivacyPool enforcing owner‑based SBT gating; strict recipient flag
  - [ ] Deployed Verifier (real Groth16) or Adapter
- Off‑chain
  - [ ] Association Builder with Poseidon and root publisher
  - [ ] Proof generator CLI or integration with prover service
  - [ ] SCA Exec CLI (approve, deposit, withdraw)
- Docs
  - [ ] README updated with deployed addresses and explorer links
  - [ ] Demo Script added (explicit judge steps with timings)

---

## 9) Timeline (Aggressive)

- Day 1: Implement enforcement flags; SCA Exec CLI approve/deposit; basic builder; deploy SCA + Pool; deposit test.
- Day 2: Circuits + verifier; integrate proof path; publish root + withdraw test; finalize docs/demo video.
- Day 3: UX polish (if UI), reliability passes, contingency prep.

---

## 10) Out of Scope (MVP)

- Advanced account abstraction, guardianship flows, batching UX.
- Yielding privacy pools, fee markets, cross‑chain features.
- Production‑grade KMS or custody.
