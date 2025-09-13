#!/usr/bin/env bash
set -euo pipefail

# ZK setup helper for beginners. This script does:
# 1) Compile the circuit
# 2) Generate Powers of Tau (phase 1) and prepare phase2 file
# 3) Run Groth16 setup for the circuit (phase 2)
# 4) Finalize the zkey and export the verification key
# 5) Export a Solidity Verifier.sol
#
# After this, you can: npm run compile && npm run deploy:verifier:standard:kaigan
# Then wrap it with the VerifierAdapter and use the adapter address as VERIFIER_ADDRESS.

# Tunables:
# POWER: 2^POWER capacity; must satisfy 2^POWER > 2 * NbConstraints
POWER="${POWER:-15}"
OUTDIR="${OUTDIR:-build}"
CIRCUIT="${CIRCUIT:-circuits/membership.circom}"
LIBDIR="${LIBDIR:-node_modules/circomlib/circuits}"

mkdir -p "$OUTDIR"

echo "[1/5] Compile circuit → R1CS, WASM, SYM (debug symbols)"
echo "    -L path: $LIBDIR (should contain poseidon.circom)"
circom "$CIRCUIT" --r1cs --wasm --sym -o "$OUTDIR" -l "$LIBDIR"

echo "[2/5] Powers of Tau (Phase 1) with power=$POWER (2^$POWER capacity)"
snarkjs powersoftau new bn128 "$POWER" "$OUTDIR/pot${POWER}_0000.ptau" -v
snarkjs powersoftau contribute "$OUTDIR/pot${POWER}_0000.ptau" "$OUTDIR/pot${POWER}_0001.ptau" --name="first" -v
snarkjs powersoftau prepare phase2 "$OUTDIR/pot${POWER}_0001.ptau" "$OUTDIR/pot${POWER}_final.ptau" -v

echo "[3/5] Groth16 setup (Phase 2)"
snarkjs r1cs info "$OUTDIR/membership.r1cs" || true
echo "    Ensure 2^$POWER > 2 * NbConstraints from the line above."
snarkjs groth16 setup "$OUTDIR/membership.r1cs" "$OUTDIR/pot${POWER}_final.ptau" "$OUTDIR/membership_0000.zkey"

echo "[4/5] Contribute and export verification key"
snarkjs zkey contribute "$OUTDIR/membership_0000.zkey" "$OUTDIR/membership_final.zkey" --name="1st zkey" -v
snarkjs zkey export verificationkey "$OUTDIR/membership_final.zkey" "$OUTDIR/verification_key.json"

echo "[5/5] Export Solidity verifier"
snarkjs zkey export solidityverifier "$OUTDIR/membership_final.zkey" contracts/Verifier.sol

echo "Done. Next: npm run compile && npm run deploy:verifier:standard:kaigan"
