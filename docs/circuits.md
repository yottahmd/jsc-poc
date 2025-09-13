# Circuits and Verifier — Quick Path (Hackathon)

This guide shows how to build and deploy a real Groth16 verifier for the minimal membership circuit and connect it to the PrivacyPool using the VerifierAdapter.

## 1) Tooling

- circom >= 2.1.4
- snarkjs >= 0.7.x
- Node.js >= 18

## 2) Circuit

- File: `circuits/membership.circom`
- Public signals: `[root, nullifier, denomIndex]`
- Private inputs: `noteSecret, denomIndexPriv, pathElements[H], pathIndex[H]`
- Hash: Poseidon; Merkle height: 20 (no external merkle include needed)

## 3) Build and Setup (example commands)

```bash
# 0. Prepare output dir and ensure circomlib is available
mkdir -p build

# 1. Compile circuit (point -l to the folder that contains poseidon.circom)
# If installed via npm: node_modules/circomlib/circuits
circom circuits/membership.circom --r1cs --wasm --sym -o build \
  -l node_modules/circomlib/circuits

# 2. Powers of Tau (use a small ptau for hackathon)
snarkjs powersoftau new bn128 15 build/pot15_0000.ptau -v
snarkjs powersoftau contribute build/pot15_0000.ptau build/pot15_0001.ptau --name="first" -v
snarkjs powersoftau prepare phase2 build/pot15_0001.ptau build/pot15_final.ptau -v

# 3. Groth16 setup
snarkjs r1cs info build/membership.r1cs  # note NbConstraints; require 2^ptau_power > 2*NbConstraints
snarkjs groth16 setup build/membership.r1cs build/pot15_final.ptau build/membership_0000.zkey
snarkjs zkey contribute build/membership_0000.zkey build/membership_final.zkey --name="1st zkey" -v
snarkjs zkey export verificationkey build/membership_final.zkey build/verification_key.json

# 4. Export Verifier.sol
snarkjs zkey export solidityverifier build/membership_final.zkey contracts/Verifier.sol
```

## 4) Deploy verifier + adapter

```bash
# Compile the project (will include contracts/Verifier.sol)
npm run compile

# Deploy the standard verifier (contract name: Verifier)
npm run deploy:verifier:standard:kaigan
# Copy the Verifier address

# Deploy the adapter, pointing to the Verifier
UNDERLYING_VERIFIER=0xVerifierAddress npm run deploy:verifier:adapter:kaigan
# Use the adapter address as VERIFIER_ADDRESS for the pool
```

## 5) Signals order and adapter encoding

- Public signals order used by the pool: `[root, nullifier, denomIndex]`
- Proof bytes for the adapter: `abi.encode(a, b, c)`
  - `a`: uint256[2]
  - `b`: uint256[2][2]
  - `c`: uint256[2]

## 6) Generating proofs

```bash
# Create witness
node build/membership_js/generate_witness.js \
     build/membership_js/membership.wasm input.json build/witness.wtns

# Generate proof
snarkjs groth16 prove build/membership_final.zkey build/witness.wtns build/proof.json build/public.json

# Extract (a,b,c,input) from proof.json/public.json and ABI-encode `a,b,c` for the adapter.
```

## 7) Pool withdraw call

- `root` = public.json[0]
- `nullifier` = public.json[1]
- `denomination` = map `denomIndex` → on-chain denomination value
- `proof` = ABI-encoded `(a,b,c)` for the adapter
- `publicSignals` = array from `public.json`

## 8) Notes

- For hackathon speed, use a small ptau and merkle height.
- Keep denominations list small to minimize constraints.
- This integrates a real ZK verifier while keeping the pool API stable.

### Troubleshooting

- Error: `invalid output path`
  - The directory passed to `-o` must exist. Run `mkdir -p build` first.
- Error: cannot find `poseidon.circom` or `merkletree.circom`
  - Pass `-l` pointing to the folder that contains those files, e.g. `-l node_modules/circomlib/circuits`.
  - Install deps: `npm i -D circom circomlib snarkjs` (or use your OS package manager).
- Error: pragma version mismatch
  - Check `circom --version`; update circom or remove/adjust the `pragma circom` line in the circuit header for your version.

---

## Beginner‑Friendly Annotated Steps (Every line explained)

This section restates the core commands with “what/why/output” next to each line so you can follow along without any ZK background.

1) Install tools locally (so scripts can find them)

```bash
npm i -D circom circomlib snarkjs
```
- What: Installs the Circom compiler, circomlib (Poseidon), and snarkjs into this project.
- Why: Ensures consistent versions and that commands work even if you don’t have them globally.
- Output: node_modules binaries and libraries.

2) Prepare an output directory for all build artifacts

```bash
mkdir -p build
```
- What: Creates the build folder.
- Why: Circom/snarkjs expect it to exist; otherwise you’ll see “invalid output path”.
- Output: An empty `build/` directory.

3) Compile the circuit (point Circom at circomlib’s Poseidon)

```bash
circom circuits/membership.circom --r1cs --wasm --sym -o build \
  -l node_modules/circomlib/circuits
```
- What: Compiles the circuit into 3 artifacts:
  - `build/membership.r1cs`: constraint system (math equations the proof must satisfy)
  - `build/membership_js/membership.wasm`: witness generator (program that computes the witness)
  - `build/membership.sym`: debug symbols mapping constraints to code
- Why: R1CS is required for setup; WASM is required to create proofs; SYM helps debugging.
- Output: Those 3 artifacts inside `build/`.

4) Create a Powers‑of‑Tau ceremony file (Phase 1), contribute, and prepare phase2

```bash
snarkjs powersoftau new bn128 15 build/pot15_0000.ptau -v
```
- What: Creates an initial PoT file on curve BN254 with capacity 2^15.
- Why: Your circuit must fit into this “size”; rule is 2^power > 2 * constraints.
- Output: `build/pot15_0000.ptau`.

```bash
snarkjs powersoftau contribute build/pot15_0000.ptau build/pot15_0001.ptau --name="first" -v
```
- What: Adds entropy to the PoT (one contribution is enough for demos).
- Why: Security — a contribution makes the setup safe.
- Output: `build/pot15_0001.ptau`.

```bash
snarkjs powersoftau prepare phase2 build/pot15_0001.ptau build/pot15_final.ptau -v
```
- What: Converts Phase 1 to a Phase 2 file.
- Why: Groth16 setup uses a “phase2 prepared” PoT.
- Output: `build/pot15_final.ptau`.

5) Run Groth16 setup (Phase 2) and finalize the zkey

```bash
snarkjs r1cs info build/membership.r1cs
```
- What: Prints number of constraints.
- Why: Double‑check `2^15 > 2 * constraints`. If not, redo PoT with a bigger power (e.g., 16).
- Output: Informational only.

```bash
snarkjs groth16 setup build/membership.r1cs build/pot15_final.ptau build/membership_0000.zkey
```
- What: Generates an initial proving/verifying key specific to your circuit.
- Why: Binds your circuit to the ceremony.
- Output: `build/membership_0000.zkey`.

```bash
snarkjs zkey contribute build/membership_0000.zkey build/membership_final.zkey --name="1st zkey" -v
```
- What: Adds a contribution and finalizes the zkey.
- Why: Improves security and produces the final key used for proofs.
- Output: `build/membership_final.zkey`.

6) Export verification key (JSON) and Solidity verifier

```bash
snarkjs zkey export verificationkey build/membership_final.zkey build/verification_key.json
```
- What: Exports VK for off‑chain verification and debugging.
- Output: `build/verification_key.json`.

```bash
snarkjs zkey export solidityverifier build/membership_final.zkey contracts/Verifier.sol
npm run compile
```
- What: Writes `contracts/Verifier.sol` and compiles it into a Hardhat artifact.
- Why: You can now deploy it and call it from the pool via the adapter.
- Output: Solidity file and a compiled artifact in `artifacts/`.

7) Create a witness and generate a proof

```bash
node build/membership_js/generate_witness.js \
     build/membership_js/membership.wasm build/input.json build/witness.wtns
```
- What: Runs the WASM to produce the witness (solution) for your inputs.
- Output: `build/witness.wtns`.

```bash
snarkjs groth16 prove build/membership_final.zkey build/witness.wtns build/proof.json build/public.json
```
- What: Creates the zk proof and the public signals.
- Output: `build/proof.json` (with a,b,c) and `build/public.json` (array: [root, nullifier, denomIndex]).

8) Encode (a,b,c) for the VerifierAdapter and pass publicSignals as‑is

```bash
node -e 'const fs=require("fs"); const { ethers } = require("ethers"); const p=JSON.parse(fs.readFileSync("build/proof.json")).proof; const a=[p.pi_a[0], p.pi_a[1]]; const b=[[p.pi_b[0][0], p.pi_b[0][1]],[p.pi_b[1][0], p.pi_b[1][1]]]; const c=[p.pi_c[0], p.pi_c[1]]; const bytes=ethers.AbiCoder.defaultAbiCoder().encode(["uint256[2]","uint256[2][2]","uint256[2]"],[a,b,c]); fs.writeFileSync("build/proof.bytes", bytes); console.log("Wrote build/proof.bytes")'
```
- What: ABI‑encodes the proof into a single bytes value the adapter understands.
- Output: `build/proof.bytes`.

Use `build/public.json` directly as `publicSignals` in the pool call.
