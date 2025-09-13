# Detailed Design — Mizuhiki SBT–Gated Privacy Pool with Smart Accounts

This document explains the full design of the MVP so any engineer can implement, test, and demo it quickly. It complements `docs/requirements.md` (authoritative requirements) and `docs/high-level-design.md` (overview).

Goal: The simplest end‑to‑end, privacy‑preserving DeFi demo on JSC Kaigan that is compliant by default via Mizuhiki Verified SBT and delivers a fast, judge‑friendly UX.

---

## 1. Problem & Approach

- Problem: Public chains expose correlational privacy. Regulators want compliance (KYC). Users need both.
- Approach: Gate a fixed‑denomination privacy pool with Mizuhiki SBT and use ZK membership proofs to privately withdraw. Smart Contract Accounts (SCAs) enforce explicit owner authorization, keeping UX simple and auditable.

---

## 2. System Architecture

Components:
- Web dApp
  - Connects via MetaMask to JSC Kaigan.
  - Checks SBT gate; guides users to acquire SBT if missing.
  - Creates notes and proofs; manages local note storage + export/import.
  - Calls SCA to execute deposits/withdrawals; shows explorer links and Audit View.
- Smart Contract Account (SCA)
  - Minimal single‑owner account; execute() requires EIP‑712 signature + nonce.
  - Optional guardian recovery (demo only) is timelocked; not required for MVP.
- PrivacyPool contract
  - Accepts ERC20 fixed‑denomination deposits with commitments; emits Deposit.
  - Withdraw verifies Groth16 proof, checks SBT, enforces nullifier uniqueness; emits Withdraw.
  - Stores association Merkle root and enforces inclusion delay.
- Groth16 Verifier
  - Auto‑generated verifier contract (Circom/snarkjs); called by the pool.
  - If necessary, an adapter standardizes the interface to `IVerifierGroth16`.
- ERC20 Token
  - **MJPY** on Kaigan is the stablecoin used by the pool; address `0x115e91ef61ae86FbECa4b5637FD79C806c331632`.
  - If unavailable during demo, fallback to the included sample ERC20 (document clearly in README).
- Mizuhiki Verified SBT
  - ERC‑721 credential deployed on JSC Kaigan. `balanceOf(addr) > 0` means verified.
- Association Set Builder (off‑chain)
  - Listens for Deposit events, updates the Merkle tree, publishes root on‑chain, and pins a JSON of the set to IPFS.

Key Interactions:
1) Connect → SBT check → SCA deployment/link.
2) Deposit → emits commitment; note stored client‑side.
3) Root published → inclusion delay elapses.
4) Withdraw → ZK proof verified → nullifier consumed → ERC20 transferred.

---

## 3. Contracts (APIs, Storage, Behavior)

### 3.1 SmartAccount (SCA)
Purpose: Generic, minimal smart account wrapping calls with explicit owner authorization.

Storage & Types:
- `owner()` from Ownable.
- `uint256 nonce` — monotonically increasing.
- `ExecRequest { address to; uint256 value; bytes data; uint256 nonce; uint256 chainId; }`

Key API:
- `execute(ExecRequest req, bytes signature) returns (bytes result)`
  - Verifies `req.nonce == nonce` and `req.chainId == block.chainid`.
  - EIP‑712 domain `MizuSCA` v1; `ExecRequest` is the typed struct.
  - Recovers signer with ECDSA; requires `signer == owner()`.
  - Increments nonce and performs the call `(req.to).call{value:req.value}(req.data)`.
  - Reverts on failure; emits `Executed(to, value, keccak256(data), usedNonce)`.

Security:
- Replay protection via nonce.
- Domain separation via chainId and EIP‑712.
- `nonReentrant` guard to protect value‑bearing calls.

Notes:
- Prefer deploying one SCA per user in demo; addresses are stable and displayable.
- If Mizuhiki SBT cannot be minted to SCAs, pool can check `owner()` instead (see 3.2).

### 3.2 PrivacyPool
Purpose: Fixed‑denomination, SBT‑gated deposit/withdraw pool with ZK verification and double‑spend prevention.

Storage:
- `IERC20 public token` — ERC20 asset.
- `address public sbt` — Mizuhiki SBT.
- `IVerifierGroth16 public verifier` — Groth16 verifier adapter.
- `mapping(uint256 => bool) isSupportedDenomination` — allowed sizes.
- `bytes32 public associationRoot` — latest Merkle root.
- `mapping(bytes32 => uint64) rootPublishedAt` — root → block number.
- `uint64 public inclusionDelayBlocks` — blocks required after root publication.
- `mapping(bytes32 => bool) nullifierUsed` — prevents double spends.

Events:
- `Deposit(uint256 denomination, bytes32 commitment, uint256 timestamp)`
- `Withdraw(bytes32 nullifier, uint256 denomination, address to, uint256 timestamp)`
- `AssociationRootUpdated(bytes32 newRoot, uint64 publishedAtBlock)`

APIs:
- `deposit(uint256 denomination, bytes32 commitment)`
  - Requires `IERC721(sbt).balanceOf(msg.sender) > 0` (SCA‑bound SBT mode).
  - Requires `isSupportedDenomination[denomination]`.
  - `token.transferFrom(msg.sender, address(this), denomination)`.
  - Emits `Deposit`.

- `publishAssociationRoot(bytes32 newRoot)` (owner‑only)
  - Updates `associationRoot`; records `rootPublishedAt[newRoot] = block.number`.
  - Emits `AssociationRootUpdated`.

- `withdraw(uint256 denomination, address recipient, bytes32 root, bytes32 nullifier, bytes proof, uint256[] publicSignals)`
  - Requires SBT at call time (same check as deposit).
  - Denomination must be supported.
  - Root must be known and eligible: `block.number >= rootPublishedAt[root] + inclusionDelayBlocks`.
  - `!nullifierUsed[nullifier]`.
  - `verifier.verifyProof(proof, publicSignals)` must return true.
  - Marks nullifier used; transfers `token` to `recipient`; emits `Withdraw`.

Recipient Compliance Mode:
- Strict (demo default): additionally require `IERC721(sbt).balanceOf(recipient) > 0`.
- Lab (disabled in demo): allow any `recipient` (documented as future work).
- Implementation: a constructor flag or setter restricted to owner before first deposit; for MVP we enforce Strict in the demo build.

Owner/Operator:
- Owner (or AccessControl role) publishes roots. Simplicity is preferred for hackathon.

### 3.3 IVerifierGroth16 and Adapter
Purpose: Abstract generated verifier differences, keep pool decoupled from verifier internals.

Interface:
- `verifyProof(bytes proof, uint256[] publicSignals) external view returns (bool)`

Adapter (if needed):
- Parses `bytes proof` → `(a,b,c)` and forwards to the auto‑generated verifier with `publicSignals`.
- Allows swapping circuits without changing `PrivacyPool`.

### 3.4 ERC20 Stablecoin
- A simple ERC20 is included (`contracts/CompliantERC20.sol`). If Kaigan has an official testnet stablecoin, use that instead.

---

## 4. ZK Circuits (Groth16)

Curve: BN254 (alt‑BN128), standard for Groth16 on EVM.

Circuit: Membership + Spend
- Public inputs:
  - `root` — association Merkle root.
  - `nullifier` — derived from secret (prevents double spend).
  - `denomIndex` — index into allowed denominations (or hash of denom).
- Private inputs:
  - `noteSecret` — randomness used to form the commitment (and nullifier).
  - `leaf` — commitment for the deposit note.
  - `merklePath` — path elements and indices to the leaf.
  - `denomination` — matches `denomIndex` via in‑circuit check.

Constraints:
- `commit(noteSecret, denomination) == leaf` (Poseidon or MiMC; pick one and keep consistent in client + builder).
- Merkle proof verifies that `leaf` is in tree with `root`.
- `nullifier = H(noteSecret || domain)` (domain binds to pool instance to avoid cross‑pool replay).
- `denomination` maps to an allowed index; `denomIndex` is exposed publicly.

Outputs and Ordering:
- The verifier’s public signals array order: `[root, nullifier, denomIndex]` (append if more signals are needed). Document the exact order in the circuit repo and adapter.

Keys & Setup:
- Provide a deterministic `demo:setup` script to generate proving/verifying keys.
- Commit small keys; generate large keys on demand; include instructions and trusted setup caveats in README.

---

## 5. Association Set Builder (Off‑Chain)

Responsibilities:
- Listen to `Deposit(denomination, commitment, timestamp)` events.
- Maintain a Merkle tree (e.g., Poseidon hash) of commitments.
- Periodically publish a new root via `publishAssociationRoot()`.
- Pin a JSON snapshot of the set to IPFS (or serve as a static file) and expose its CID/URL.

JSON Schema (example):
```json
{
  "root": "0x...",
  "updatedAt": 1730000000,
  "hashFunction": "poseidon",
  "height": 20,
  "denominations": [100000000000000000, 1000000000000000000],
  "leaves": [
    {"commitment": "0x..", "denomIndex": 0, "blockNumber": 123, "txHash": "0x.."}
  ]
}
```

Eligibility:
- SBT is enforced in‑contract, so only SBT‑holders can deposit; no extra filtering required when building the set.

Publishing Policy:
- For demo, batch deposits every N blocks (e.g., 10–30) to help anonymity.
- The root becomes eligible for withdraws after `inclusionDelayBlocks`.

---

## 6. Client Design

Tech: React or minimal TS + ethers v6; MetaMask only.

Screens:
- Gate: Show SBT requirement, with link to SBT faucet/allowlist; connect wallet; SBT status check.
- Dashboard: Show SCA address, balances, denomination picker.
- Deposit: Confirm denom, allowance checks, submit, show explorer link.
- Withdraw: Destination address (default fresh), generate proof, submit, show explorer link.
- Audit View: Show latest on‑chain root, link to association set JSON/IPFS, gate status confirmation.
- Tutorial: 60–90s walkthrough of the flow and privacy guidance.

Local Storage:
- `notes`: array of `{secret, denomIndex, leaf, createdAt}`. Provide export/import (file/string).
- Consider optional local encryption; for MVP, plain storage is acceptable with a clear warning.

Prover:
- In‑browser snarkjs WASM; fallback to an optional local service if needed (no PII; transmit only circuit inputs).

Demo Mode:
- Seeded example with pre‑deployed addresses and a small set of pre‑seeded deposits to ensure a smooth demo.

---

## 7. Configuration & Parameters

- Network: JSC Kaigan (chainId: 5278000).
- Contracts:
  - `MIZUHIKI_SBT_ADDRESS`: Provided by Mizuhiki on Kaigan.
  - `ERC20_TOKEN_ADDRESS`: **MJPY** `0x115e91ef61ae86FbECa4b5637FD79C806c331632`.
  - `VERIFIER_ADDRESS`: Deployed Groth16 verifier or adapter.
  - `PRIVACY_POOL_ADDRESS`: Deployed pool.
  - `SCA_FACTORY` (optional if using a factory) or deploy SCAs directly per user.
- Pool Params:
  - `DENOMINATIONS`: e.g., `[0.1, 1, 10]` in token units; on‑chain as integer wei.
  - `INCLUSION_DELAY_BLOCKS`: e.g., `20`.
  - `STRICT_RECIPIENT_MODE`: true in demo build.

---

## 8. Security Analysis

- Authorization: All state changes via SCA `execute()` with signature + nonce.
- Gating: SBT checked at call time for both deposit and withdraw; no client‑side only checks.
- Double Spend: `nullifierUsed` prevents reuse.
- Reentrancy: Guards around state changes + external calls (withdraw path).
- DoS: Limit proof sizes; practical constraint is EVM gas for verifier; UI retries on transient failures.
- PII: None stored on‑chain; events avoid address linkages beyond normal contract interactions.
- tx.origin: Never used.
- Recipient Compliance: Strict mode enforces recipient SBT; clearly documented.

---

## 9. Testing & Validation

Unit Tests:
- SBT gating (positive/negative) on deposit and withdraw.
- SCA signature and nonce replay protection.
- Denominations: only allowed values pass; invalid values revert.
- Association root eligibility (before/after delay).
- Nullifier double‑spend rejection.
- Strict recipient mode enforcement.

E2E Tests:
- Deposit → root publish → inclusion delay → withdraw → balances updated; events match expectations.

Manual Demo:
- Scripted actions mirroring README Demo Script; explorer links validated.

---

## 10. Deployment Plan

Order:
1) Deploy ERC20 (if needed) and fund demo wallets.
2) Deploy Groth16 Verifier (or adapter) with generated VK.
3) Deploy PrivacyPool with token, SBT address, verifier, denominations, delay.
4) Verify contracts on Kaigan explorer; record addresses in README.
5) Pre‑seed pool with a few deposits for each denomination.
6) Publish initial Merkle root; confirm eligibility window.

---

## 11. Compliance Mapping (Sponsor Criteria)

- Uses Mizuhiki Verified SBT on JSC Kaigan (on‑chain gating at call time).
- Privacy preserved via ZK membership proof and fixed denominations; no on‑chain PII.
- UX emphasizes clarity and safety: gate copy, denom picker, inclusion countdown, audit view, tutorial.
- Completeness: reproducible setup, explorer‑verified addresses, video demo ≤ 3 minutes, team summary, and README sections.

---

## 12. Future Work

- Smart‑recipient routing and stealth addresses.
- Yielding privacy pools and pooled fees.
- Multi‑asset support; dynamic denominations.
- More robust, trust‑minimized association root updates.
- Alternative circuits (Plonkish/UltraPlonk) via Noir/Barretenberg if time allows.
