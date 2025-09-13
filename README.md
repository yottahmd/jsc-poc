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
- Stablecoin: `MJPY` on Kaigan — `0x115e91ef61ae86FbECa4b5637FD79C806c331632`

---

## Repository Structure

- `contracts/SmartAccount.sol` — Minimal SCA with EIP‑712 execute and nonce.
- `contracts/PrivacyPool.sol` — SBT‑gated pool with fixed denominations, nullifier set, and ZK verification hook.
- `contracts/IVerifierGroth16.sol` — Verifier interface expected by the pool.
- `contracts/CompliantERC20.sol` — Sample ERC20 (for workshop/fallback).
- `scripts/*.ts` — Deployment and helper scripts (SCA, PrivacyPool, root publishing, ERC20 workshop scripts).
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

# Mizuhiki SBT on Kaigan
SBT_CONTRACT_ADDRESS=0xYourMizuhikiSbt

# Optional defaults for deploy utilities
OWNER_ADDRESS=0xOwner
ERC20_TOKEN_ADDRESS=0x115e91ef61ae86FbECa4b5637FD79C806c331632 # MJPY
VERIFIER_ADDRESS=0xVerifier # must implement IVerifierGroth16
DENOMS_UNITS=1,10,100
ERC20_DECIMALS=18
INCLUSION_DELAY_BLOCKS=20
PRIVACY_POOL_ADDRESS=0xPool
```

---

## Build and Compile

```bash
npm run compile
```

---

## Deploy: SmartAccount and PrivacyPool

Compile first, then deploy.

```bash
# Deploy SmartAccount (SCA). Owner defaults to deployer.
OWNER_ADDRESS=0xYourOwner npm run deploy:sca:kaigan

# Option A) Deploy a mock verifier for Demo Mode
npm run deploy:verifier:kaigan

# Deploy PrivacyPool using MJPY by default.
# Required: SBT_CONTRACT_ADDRESS, VERIFIER_ADDRESS (use the mock address for demo)
SBT_CONTRACT_ADDRESS=0xSbt VERIFIER_ADDRESS=0xVerifier \
DENOMS_UNITS="1,10,100" INCLUSION_DELAY_BLOCKS=20 \
npm run deploy:pool:kaigan

# Build a demo association root from Deposit events
PRIVACY_POOL_ADDRESS=0xPool npm run build:root:kaigan

# Or publish a specific root directly
PRIVACY_POOL_ADDRESS=0xPool ROOT=0xYourRoot npm run publish:root:kaigan
```

Notes:
- The verifier must implement `IVerifierGroth16.verifyProof(bytes, uint256[]) → bool`.
- For a quick demo without circuits, deploy a mock verifier that always returns true (not included here) and mark the build as “Demo Mode”.

---

## CLI Demo (No Frontend)

This repo ships contracts and deploy scripts. A minimal dApp is described in `docs`, but you can exercise the core flow from the Hardhat console.

1) Deploy SCA and Pool (above) and fund the SCA with `MJPY`.
2) From the Hardhat console, approve and deposit via SCA execute:

```ts
// npx hardhat console --network kaigan
const [signer] = await ethers.getSigners();
const sca = await ethers.getContractAt("SmartAccount", "0xYourSCA");
const pool = await ethers.getContractAt("PrivacyPool", "0xYourPool");
const mjpy = await ethers.getContractAt("IERC20", "0x115e91ef61ae86FbECa4b5637FD79C806c331632");

// 1. Approve via SCA.execute (build calldata off-chain in a script in production)
let data = mjpy.interface.encodeFunctionData("approve", [pool.target, ethers.parseUnits("1", 18)]);
let req = { to: mjpy.target, value: 0n, data, nonce: (await sca.nonce()), chainId: (await ethers.provider.getNetwork()).chainId };
// Sign EIP712 off-chain in a real client; here assume signer is owner and call execute directly for demo
await sca.connect(signer).execute(req, "0x"); // For demo only if execute allows direct owner calls; otherwise pre-sign

// 2. Deposit via SCA.execute
const commitment = "0x"+"11".padEnd(64,"0");
data = pool.interface.encodeFunctionData("deposit", [ethers.parseUnits("1", 18), commitment]);
req = { to: pool.target, value: 0n, data, nonce: (await sca.nonce()), chainId: (await ethers.provider.getNetwork()).chainId };
await sca.connect(signer).execute(req, "0x");
```

3) Publish a root and then withdraw similarly (requires verifier and proof inputs).

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

## Supported Networks

- `hardhat` (local dev)
- `kaigan` (JSC Kaigan testnet — chainId `5278000`, native gas token `JETH`)
