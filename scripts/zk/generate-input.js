#!/usr/bin/env node
// Generates build/input.json for the membership circuit with a simple
// all-zero Merkle path. It also computes root_pub and nullifier_pub using Poseidon.
//
// Env vars (optional):
//  - NOTE_SECRET: bigint-like value for the note secret (default random 10^10)
//  - DENOM_INDEX: integer denom index used in the circuit (default 0)
//  - HEIGHT: Merkle height (default 20)

const fs = require("fs");

(async () => {
  const { buildPoseidon } = require("circomlibjs");
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const HEIGHT = parseInt(process.env.HEIGHT || "20", 10);
  const denomIndex = BigInt(process.env.DENOM_INDEX || "0");
  const noteSecret = BigInt(process.env.NOTE_SECRET || (Math.floor(Math.random() * 1e10) + 1).toString());

  // leaf = Poseidon(noteSecret, denomIndex)
  const leaf = F.toObject(poseidon([noteSecret, denomIndex]));

  // Recompute root with all-zero siblings, always treat current as left child
  let cur = leaf;
  for (let i = 0; i < HEIGHT; i++) {
    const sibling = 0n;
    cur = F.toObject(poseidon([cur, sibling]));
  }
  const root = cur;

  // nullifier = Poseidon(noteSecret)
  const nullifier = F.toObject(poseidon([noteSecret]));

  const input = {
    noteSecret: noteSecret.toString(),
    denomIndexPriv: Number(denomIndex),
    pathElements: Array(HEIGHT).fill("0"),
    pathIndex: Array(HEIGHT).fill(0),
    root_pub: root.toString(),
    nullifier_pub: nullifier.toString(),
    denomIndex_pub: Number(denomIndex),
  };

  if (!fs.existsSync("build")) fs.mkdirSync("build", { recursive: true });
  fs.writeFileSync("build/input.json", JSON.stringify(input, null, 2));

  // Also write a helper with hex conversions for root/nullifier
  const toHex = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
  fs.writeFileSync(
    "build/input.meta.json",
    JSON.stringify(
      {
        noteSecret: noteSecret.toString(),
        denomIndex: Number(denomIndex),
        rootHex: toHex(root),
        nullifierHex: toHex(nullifier),
      },
      null,
      2
    )
  );

  console.log("Wrote build/input.json and build/input.meta.json");
})();

