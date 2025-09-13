# Mizuhiki SBT–Gated Privacy Pool (JSC Kaigan)

One‑sentence summary: A simple, compliant privacy pool on JSC Kaigan where only Mizuhiki‑verified users can privately deposit and withdraw MJPY via a Smart Contract Account.

This project targets the ETHTokyo’25 Japan Smart Chain sponsor bounty. It demonstrates privacy and compliance together by gating all interactions with the Mizuhiki Verified SBT and using fixed‑denomination private withdrawals. Contracts compile and deploy on JSC Kaigan (chainId `5278000`, native gas token `JETH`).

---

## How We Use Mizuhiki Verified SBT

- Gate on‑chain access: Both `deposit` and `withdraw` require the caller to hold the Mizuhiki Verified SBT on JSC Kaigan.
- Preferred mode: The SBT is held by the user’s Smart Contract Account (SCA), so the pool checks `balanceOf(msg.sender) > 0` on each call.
- Alternative mode (supported in design): The pool checks `balanceOf(SCA.owner()) > 0` if SBT cannot be minted to SCAs.
- Optional strict recipient mode (design): Require the `recipient` to also hold the SBT for demo compliance.

Details: See `docs/requirements.md`, `docs/high-level-design.md`, and `docs/detailed-design.md`.

---

## Network and Assets

- Network: JSC Kaigan testnet
  - chainId: `5278000`
  - native gas token: `JETH`
- Stablecoin (Kaigan only): `MJPY` — `0x115e91ef61ae86FbECa4b5637FD79C806c331632` (Explorer: https://testnet.routescan.io/address/0x115e91ef61ae86FbECa4b5637FD79C806c331632)
- Mizuhiki SBT (Kaigan only): `0x606F72657e72cd1218444C69eF9D366c62C54978` (Explorer: https://testnet.routescan.io/address/0x606F72657e72cd1218444C69eF9D366c62C54978)

---

## Known Kaigan Addresses

| Component | Address | Explorer |
|---|---|---|
| Mizuhiki Verified SBT | `0x606F72657e72cd1218444C69eF9D366c62C54978` | https://testnet.routescan.io/address/0x606F72657e72cd1218444C69eF9D366c62C54978 |
| MJPY ERC20 | `0x115e91ef61ae86FbECa4b5637FD79C806c331632` | https://testnet.routescan.io/address/0x115e91ef61ae86FbECa4b5637FD79C806c331632 |
| PrivacyPool (this repo) | To be filled after deploy | — |
| Verifier (Groth16) | To be filled after deploy | — |
| SmartAccount (example) | To be filled after deploy | — |

---

## Repository Structure

- `contracts/SmartAccount.sol` — Minimal SCA with EIP‑712 execute and nonce.
- `contracts/PrivacyPool.sol` — SBT‑gated pool with fixed denominations, nullifier set, and ZK verification hook.
- `contracts/IVerifierGroth16.sol` — Verifier interface expected by the pool.
- `scripts/deploy-smart-account.ts` — Deploys a SmartAccount with a specified owner.
- `scripts/deploy-privacy-pool.ts` — Deploys the PrivacyPool wired to MJPY, SBT, and a verifier.
- `scripts/publish-root.ts` — Publishes a new association root to the pool.
- `docs/*.md` — Requirements, high‑level design, detailed design with Mermaid sequences.

---

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- Hardhat and an RPC token/URL for Kaigan
- A funded testnet account for gas (JETH)

---

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your keys and addresses
```

Environment variables (`.env`):

```env
# Required for deployments
PRIVATE_KEY=your_private_key
JSC_RPC_KEY=YOUR_JSC_RPC_ENDPOINT_OR_TOKEN
# Format: either a full URL or a token.
# If token is provided, Hardhat constructs:
#   https://rpc.kaigan.jsc.dev/rpc?token=${JSC_RPC_KEY}

# Mizuhiki SBT on Kaigan (only works on Kaigan)
SBT_CONTRACT_ADDRESS=0x606F72657e72cd1218444C69eF9D366c62C54978

# Optional defaults for deploy utilities
OWNER_ADDRESS=0xOwner
ERC20_TOKEN_ADDRESS=0x115e91ef61ae86FbECa4b5637FD79C806c331632 # MJPY (Kaigan only)
VERIFIER_ADDRESS=0xVerifier # must implement IVerifierGroth16
DENOMS_UNITS=1,10,100
ERC20_DECIMALS=18
INCLUSION_DELAY_BLOCKS=20
PRIVACY_POOL_ADDRESS=0xPool
```

### Environment Variables Reference

| Variable | Required | Default | Description | Example |
|---|---|---|---|---|
| `PRIVATE_KEY` | Yes | — | Deployer private key for Kaigan; must have JETH for gas. | `0xabc...` |
| `JSC_RPC_KEY` | Yes | — | Kaigan RPC URL or token. If a token is provided, Hardhat expands it to `https://rpc.kaigan.jsc.dev/rpc?token=${JSC_RPC_KEY}`. | `https://rpc.kaigan.jsc.dev/rpc?token=...` or `your_token` |
| `SBT_CONTRACT_ADDRESS` | Yes | — | Mizuhiki Verified SBT on Kaigan (gates pool access). | `0x606F72657e72cd1218444C69eF9D366c62C54978` |
| `ERC20_TOKEN_ADDRESS` | Yes | MJPY | ERC20 used by the pool. On Kaigan, MJPY address. | `0x115e91ef61ae86FbECa4b5637FD79C806c331632` |
| `VERIFIER_ADDRESS` | Yes | — | Address of the on-chain ZK verifier implementing `IVerifierGroth16`. | `0xVerifier...` |
| `OWNER_ADDRESS` | No | Deployer | Owner for SmartAccount/PrivacyPool deployments. | `0xOwner...` |
| `DENOMS_UNITS` | No | `1,10,100` | Comma-separated denomination amounts in whole-token units. | `"1,10,100"` |
| `ERC20_DECIMALS` | No | `18` | ERC20 decimals for denomination parsing. | `18` |
| `INCLUSION_DELAY_BLOCKS` | No | `20` | Blocks to wait after root publication before withdrawals using that root are eligible. | `20` |
| `PRIVACY_POOL_ADDRESS` | No | — | Deployed pool address used by `publish-root` script. | `0xPool...` |

---

## Build and Compile

```bash
npm run compile
```

---

## Deploy: SmartAccount and PrivacyPool (Kaigan)

Compile first, then deploy.

```bash
# Deploy SmartAccount (SCA). Owner defaults to deployer.
OWNER_ADDRESS=0xYourOwner npm run deploy:sca:kaigan

# Deploy PrivacyPool using MJPY by default.
# Required: SBT_CONTRACT_ADDRESS, VERIFIER_ADDRESS
SBT_CONTRACT_ADDRESS=0xSbt VERIFIER_ADDRESS=0xVerifier \
DENOMS_UNITS="1,10,100" INCLUSION_DELAY_BLOCKS=20 \
npm run deploy:pool:kaigan

# Publish a specific root directly (computed off-chain)
PRIVACY_POOL_ADDRESS=0xPool ROOT=0xYourRoot npm run publish:root:kaigan
```

Notes:
- The verifier must implement `IVerifierGroth16.verifyProof(bytes, uint256[]) → bool`.
- For a quick demo without circuits, deploy a mock verifier that always returns true (not included here) and mark the build as “Demo Mode”.

---

## Demo Video / Slides

- Video (≤ 3 minutes): TODO add link
- Slides: TODO add link

---

## Threat Model (Brief)

- Protects: On-chain linkability between deposit and withdraw (fixed denominations, fresh recipients), double-spend via nullifiers.
- Does not protect: Global timing analysis, network-level metadata, or off-chain correlation.
- No PII on-chain: Only SBT gating facts and pool events are on-chain.

---

## Compliance Note

- Compliance: The pool blocks non‑KYC usage by requiring the Mizuhiki SBT at call time.
- Privacy: ZK membership proofs break naive linkability while keeping denominations fixed for simplicity.
- Optional strict recipient mode ensures both sides are KYC’d for regulated contexts.

---

## Next Steps

- Implement strict recipient SBT enforcement flag in `PrivacyPool` (demo‑default).
- Add owner()-fallback enforcement option for SBT checks.
- Add real Groth16 circuits, keys, verifier adapter, and proof CLI.
- Build the minimal web dApp (gate, deposit, withdraw, audit view) per `docs`.

---

## Team

- Name — Role — handle
- Name — Role — handle
- Name — Role — handle

---

## Supported Network

- `kaigan` (JSC Kaigan testnet — chainId `5278000`, native gas token `JETH`)
