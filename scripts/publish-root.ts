import { ethers } from "hardhat";

/**
 * Publishes a new association root on an existing PrivacyPool.
 *
 * Env vars:
 *  - PRIVACY_POOL_ADDRESS (required)
 *  - ROOT (hex bytes32) or pass as argv[2]
 */
async function main() {
  const [signer] = await ethers.getSigners();
  const poolAddr = (process.env.PRIVACY_POOL_ADDRESS || "").trim();
  const rootArg = process.argv[2] || process.env.ROOT || "";

  if (!ethers.isAddress(poolAddr)) throw new Error("PRIVACY_POOL_ADDRESS is required and must be an address");
  if (!/^0x[0-9a-fA-F]{64}$/.test(rootArg)) throw new Error("ROOT must be a 0x-prefixed 32-byte hex");

  console.log("Signer:", signer.address);
  console.log("Pool:", poolAddr);
  console.log("Root:", rootArg);

  const pool = await ethers.getContractAt("PrivacyPool", poolAddr, signer);
  const tx = await pool.publishAssociationRoot(rootArg as `0x${string}`);
  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("Root published.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

