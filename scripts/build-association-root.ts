import { ethers } from "hardhat";

/**
 * Demo Association Set Builder:
 * - Reads Deposit events from a PrivacyPool
 * - Computes a toy root as keccak256 of concatenated commitments
 * - Optionally publishes the root to the pool
 *
 * Env vars:
 *  - PRIVACY_POOL_ADDRESS (required)
 *  - FROM_BLOCK (optional, default 0)
 *  - TO_BLOCK (optional, default latest)
 *  - PUBLISH (optional, "1" to publish)
 */
async function main() {
  const poolAddr = (process.env.PRIVACY_POOL_ADDRESS || "").trim();
  if (!ethers.isAddress(poolAddr)) throw new Error("PRIVACY_POOL_ADDRESS is required and must be an address");

  const fromBlock = process.env.FROM_BLOCK ? BigInt(process.env.FROM_BLOCK) : 0n;
  const latest = await ethers.provider.getBlockNumber();
  const toBlock = process.env.TO_BLOCK ? BigInt(process.env.TO_BLOCK) : BigInt(latest);

  const pool = await ethers.getContractAt("PrivacyPool", poolAddr);

  const depositEvent = pool.filters.Deposit();
  const logs = await pool.queryFilter(depositEvent, Number(fromBlock), Number(toBlock));
  const commitments: string[] = logs.map((e) => {
    // event Deposit(uint256 indexed denomination, bytes32 indexed commitment, uint256 timestamp)
    const commitment = e.args?.[1] as string;
    return commitment;
  });

  // Compute a toy root = keccak256(commitment1 || commitment2 || ...)
  const packed = ethers.solidityPacked(["bytes32[]"], [commitments]);
  const root = ethers.keccak256(packed);

  console.log("Deposits:", commitments.length);
  console.log("Computed demo root:", root);

  if (process.env.PUBLISH === "1") {
    const [signer] = await ethers.getSigners();
    const poolWithSigner = pool.connect(signer);
    const tx = await poolWithSigner.publishAssociationRoot(root as `0x${string}`);
    console.log("Publish tx:", tx.hash);
    await tx.wait();
    console.log("Root published.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

