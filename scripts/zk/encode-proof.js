#!/usr/bin/env node
// Reads build/proof.json and build/public.json, ABI-encodes (a,b,c) for the
// VerifierAdapter, and writes build/proof.bytes and build/public.hex.json.

const fs = require("fs");

try {
  const { AbiCoder } = require("ethers");
  const coder = AbiCoder.defaultAbiCoder();
  const proof = JSON.parse(fs.readFileSync("build/proof.json", "utf8")).proof;
  const pub = JSON.parse(fs.readFileSync("build/public.json", "utf8"));

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][0], proof.pi_b[0][1]],
    [proof.pi_b[1][0], proof.pi_b[1][1]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  const bytes = coder.encode(["uint256[2]", "uint256[2][2]", "uint256[2]"], [a, b, c]);
  fs.writeFileSync("build/proof.bytes", bytes);

  const toHex = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
  fs.writeFileSync(
    "build/public.hex.json",
    JSON.stringify({ root: toHex(pub[0]), nullifier: toHex(pub[1]), denomIndex: pub[2], pub }, null, 2)
  );

  console.log("Wrote build/proof.bytes and build/public.hex.json");
} catch (e) {
  console.error("Failed to encode proof:", e.message);
  process.exit(1);
}

