# Mizuhiki SBT–Gated Privacy Pool (JSC Kaigan)

One‑sentence summary: A simple, compliant privacy pool on JSC Kaigan where only Mizuhiki‑verified users can privately deposit and withdraw MJPY via a Smart Contract Account.

This project targets the ETHTokyo’25 Japan Smart Chain sponsor bounty. It demonstrates privacy and compliance together by gating all interactions with the Mizuhiki Verified SBT and using fixed‑denomination private withdrawals. Contracts compile and deploy on JSC Kaigan (chainId `5278000`, native gas token `JETH`).

---

## How We Use Mizuhiki Verified SBT

- Gate on‑chain access: Both `deposit` and `withdraw` require the SCA owner to hold the Mizuhiki Verified SBT on JSC Kaigan.
- Enforcement: The pool checks `IERC721(sbt).balanceOf(SCA.owner()) > 0` at call time (if an EOA calls directly, `msg.sender` is used).
- Optional strict recipient mode: Can require the `recipient` to also hold the SBT (default OFF).

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
| Demo ERC20 | `0x98B7F42811f4Ce24eE1e85Ca8468D7b02FE58515` | https://testnet.routescan.io/address/0x98B7F42811f4Ce24eE1e85Ca8468D7b02FE58515|
| PrivacyPool (this repo) | `0x63005393EAf676A34CBD8E51107bcaa07F0651e0` | https://testnet.routescan.io/address/0x63005393EAf676A34CBD8E51107bcaa07F0651e0 |
| VerifierAdapter | `0x07eA6eAD5eA19267575cBb592b337cB440d3278D` | https://testnet.routescan.io/address/0x07eA6eAD5eA19267575cBb592b337cB440d3278D |
| Verifier (Groth16) | `0x8996a763B3A33657F3f135D5Dd5c75D8C42F44cA` | https://testnet.routescan.io/address/0x8996a763B3A33657F3f135D5Dd5c75D8C42F44cA |
| SmartAccount (example) | `0x4De514BF1169A2e7AAF303c39Eb258De15a63dac` | https://testnet.routescan.io/address/0x4De514BF1169A2e7AAF303c39Eb258De15a63dac |

---

## Demo Token Option (when MJPY approvals are restricted)

MJPY enforces compliance on spenders/receivers (spender must be SBT holder or a whitelisted DEX). If your pool isn’t whitelisted, `approve(owner→pool)` reverts. For end‑to‑end demos, use a demo ERC20 while keeping Mizuhiki SBT gating for compliance.

Deploy demo token and mint to your EOA and/or SCA:

```bash
# Deploy a demo ERC20 (defaults to 1,000,000 units with 18 decimals)
# You can override supply via DEMO_INITIAL (wei) or DEMO_INITIAL_UNITS + DECIMALS
DEMO_INITIAL_UNITS=1000000 DECIMALS=18 npm run deploy:demoerc20:kaigan
# Output: DemoERC20 deployed at: 0xYourDemo

# Mint tokens (owner only). Uses ERC20_TOKEN_ADDRESS from env.
# Option A: human units (recommended)
ERC20_TOKEN_ADDRESS=0xYourDemo AMOUNT_UNITS=100 DECIMALS=18 npm run mint:demoerc20:kaigan
# Option B: raw wei
# ERC20_TOKEN_ADDRESS=0xYourDemo AMOUNT=100000000000000000000 npm run mint:demoerc20:kaigan
```

Then deploy the pool using the demo token (override ERC20_TOKEN_ADDRESS):

```bash
ERC20_TOKEN_ADDRESS=0xYourDemo \
SBT_CONTRACT_ADDRESS=0x606F72657e72cd1218444C69eF9D366c62C54978 \
VERIFIER_ADDRESS=0xYourAdapter \
DENOMS_UNITS="1,10,100" INCLUSION_DELAY_BLOCKS=0 GATE_MODE=owner STRICT_RECIPIENT=0 \
npm run deploy:pool:kaigan
```

Now approve/deposit/withdraw will succeed against the demo token without MJPY’s DEX/SBT spender restriction. The pool still enforces SBT gating at call‑time.

Approve and deposit with one script (uses ERC20_TOKEN_ADDRESS). Use AMOUNT_UNITS to avoid wei math:
```bash
ERC20_TOKEN_ADDRESS=0xYourDemo POOL=0xYourPool AMOUNT_UNITS=1 DECIMALS=18 npm run deposit:demo:kaigan
```

Note on “huge numbers”: ERC‑20 tokens use decimals (commonly 18). On-chain amounts are in the smallest unit (“wei”).
- 1 token with 18 decimals = 1,000,000,000,000,000,000 wei (1e18)
- The scripts log both wei and human units to avoid confusion.

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
| `GATE_MODE` | No | `owner` | Enforcement mode: `caller` = SCA must hold SBT; `owner` = check `owner()` of caller if present, else `msg.sender`. | `owner` |
| `STRICT_RECIPIENT` | No | `0` | If `1`, require recipient to hold SBT on withdraw (optional). | `0` |
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

## ZK Verifier (Beginner Path)

1) Generate Verifier.sol and keys with the helper script (runs circom + snarkjs and explains each step):
```bash
npm run zk:setup
```
2) Deploy the standard verifier and adapter:
```bash
npm run deploy:verifier:standard:kaigan
UNDERLYING_VERIFIER=0xVerifierAddress npm run deploy:verifier:adapter:kaigan
```
3) Use the adapter address as `VERIFIER_ADDRESS` when deploying the pool.

If `deploy:verifier:standard:kaigan` says the Verifier artifact is missing:
- Ensure `contracts/Verifier.sol` exists (generated by `npm run zk:setup`). Then run `npm run compile`.
- If your generated contract has a different name (e.g., `Groth16Verifier`), set `VERIFIER_CONTRACT_NAME=<Name>` when deploying:
  - `VERIFIER_CONTRACT_NAME=Groth16Verifier npm run deploy:verifier:standard:kaigan`

---

## Deploy: SmartAccount and PrivacyPool (Kaigan)

Compile first, then deploy.

```bash
# Deploy SmartAccount (SCA). Owner defaults to deployer.
OWNER_ADDRESS=0xYourOwner npm run deploy:sca:kaigan

# Deploy PrivacyPool using MJPY by default.
# Required: SBT_CONTRACT_ADDRESS, VERIFIER_ADDRESS
# Optional enforcement flags:
#   GATE_MODE=caller|owner (default owner)
#   STRICT_RECIPIENT=1|0 (default 0, off)
SBT_CONTRACT_ADDRESS=0xSbt VERIFIER_ADDRESS=0xVerifierOrAdapter \
DENOMS_UNITS="1,10,100" INCLUSION_DELAY_BLOCKS=20 GATE_MODE=owner STRICT_RECIPIENT=0 \
npm run deploy:pool:kaigan

# Publish a specific root directly (computed off-chain)
PRIVACY_POOL_ADDRESS=0xPool ROOT=0xYourRoot npm run publish:root:kaigan
```

Notes:
- The pool expects a verifier with interface `IVerifierGroth16.verifyProof(bytes, uint256[]) → bool`.
- Use the VerifierAdapter to wrap a standard Groth16 `Verifier` and pass `(a,b,c)` via ABI-encoded `proof`.

---

## End‑to‑End: Deposit → Proof → Publish → Withdraw (Kaigan)

Assumes you deployed:
- VerifierAdapter (use its address as VERIFIER_ADDRESS for the pool)
- PrivacyPool (owner‑gating, STRICT_RECIPIENT=0). If you want instant testing, set `INCLUSION_DELAY_BLOCKS=0` when deploying.

1) Approve + Deposit 1 MJPY to fund the pool
```bash
npx hardhat console --network kaigan
```
```js
const pool = await ethers.getContractAt("PrivacyPool", "0xYourPool");
const mjpy = await ethers.getContractAt("IERC20", "0x115e91ef61ae86FbECa4b5637FD79C806c331632");
await mjpy.approve(pool.target, ethers.parseUnits("1", 18));
const commitment = "0x" + "11".padEnd(64, "0");
await pool.deposit(ethers.parseUnits("1", 18), commitment);
```

2) Create inputs, witness, and proof
```bash
npm run zk:input                      # writes build/input.json and input.meta.json
npm run zk:prove                      # runs witness gen + proof → builds proof.json/public.json
npm run zk:encode                     # writes proof.bytes and public.hex.json
```

3) Publish the root from public.hex.json and wait eligibility
```bash
export POOL=0xYourPool
export ROOT=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("build/public.hex.json")).root)')
PRIVACY_POOL_ADDRESS=$POOL ROOT=$ROOT npm run publish:root:kaigan
```
If your pool was deployed with `INCLUSION_DELAY_BLOCKS=20`, wait ~20 blocks before withdrawing. For instant testing, deploy with `INCLUSION_DELAY_BLOCKS=0`.

4) Withdraw using the adapter
```bash
npx hardhat console --network kaigan
```
```js
const fs = require("fs");
const pool = await ethers.getContractAt("PrivacyPool", "0xYourPool");
const denom = ethers.parseUnits("1", 18);
const recipient = "0xRecipient";
const j = JSON.parse(fs.readFileSync("build/public.hex.json", "utf8"));
const proofBytes = fs.readFileSync("build/proof.bytes", "utf8");
await pool.withdraw(denom, recipient, j.root, j.nullifier, proofBytes, j.pub);
```

Common pitfalls:
- SBT gate: The EOA calling deposit/withdraw must hold Mizuhiki SBT (0x606F72657e72cd1218444C69eF9D366c62C54978).
- Denomination: `denomIndex` in the proof must map to a configured on‑chain denomination (we used 1 MJPY for index 0).
- Inclusion delay: If non‑zero, wait the required blocks after publishing the root.

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
