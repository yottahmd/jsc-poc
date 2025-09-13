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
