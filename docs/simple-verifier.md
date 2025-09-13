# Simple Membership Verifier (Demo Mode)

This verifier provides the simplest, non‑ZK check to enable end‑to‑end demos on Kaigan. It verifies Merkle inclusion and basic note/nullifier relations on‑chain, without cryptography.

Contract: `contracts/SimpleMembershipVerifier.sol`

Public signals (uint256[])
- [0] `root` — Merkle root as uint256 (bytes32)
- [1] `nullifier` — bytes32 as uint256
- [2] `denom` — denomination in token units

Proof encoding (bytes)
- ABI‑encoded tuple:
  - `bytes32 leafCommitment`
  - `bytes32[] siblings` (Merkle path from leaf to root)
  - `uint256 pathBits` (bit i = 1 means sibling is on the left at level i)
  - `bytes32 noteSecret`

Relations enforced
- `root == merkle(leafCommitment, siblings, pathBits)` using `keccak256`
- `nullifier == keccak256(noteSecret)`
- `leafCommitment == keccak256(noteSecret || denom)`

Usage with PrivacyPool.withdraw
- In the pool call, pass:
  - `root` — the published association root
  - `nullifier` — `keccak256(noteSecret)` for your note
  - `denomination` — one of the supported fixed denominations
  - `proof` — `abi.encode(leaf, siblings, pathBits, noteSecret)`
  - `publicSignals` — `[root, nullifier, denomination]`

Notes
- This is for hackathon/demo only and provides no cryptographic privacy.
- It mirrors the shape of a zk membership proof so the flow can be upgraded later to a real verifier without changing the pool API.
