import { ethers } from "hardhat";

/**
 * Approves and deposits demo ERC20 into the PrivacyPool.
 *
 * Env:
 *  - POOL (required): PrivacyPool address
 *  - ERC20_TOKEN_ADDRESS (required): Demo ERC20 address (temporarily override .env)
 *  - AMOUNT (one of):
 *      - AMOUNT (wei) e.g., 1000000000000000000 for 1 token
 *      - or AMOUNT_UNITS (human) with DECIMALS (default 18) e.g., AMOUNT_UNITS=1 DECIMALS=18
 *  - COMMITMENT (optional): 32-byte hex commitment; default: 0x11.. padded
 */
async function main() {
  const poolAddr = (process.env.POOL || "").trim();
  const tokenAddr = (process.env.ERC20_TOKEN_ADDRESS || "").trim();
  const amountStr = (process.env.AMOUNT || "").trim();
  const amountUnits = (process.env.AMOUNT_UNITS || "").trim();
  const decimals = parseInt(process.env.DECIMALS || "18", 10);
  const commitment = (process.env.COMMITMENT || ("0x" + "11".padEnd(64, "0"))).trim() as `0x${string}`;

  if (!ethers.isAddress(poolAddr)) throw new Error("POOL is required and must be an address");
  if (!ethers.isAddress(tokenAddr)) throw new Error("ERC20_TOKEN_ADDRESS is required and must be an address");
  let amount: bigint;
  if (amountStr) amount = BigInt(amountStr);
  else if (amountUnits) amount = ethers.parseUnits(amountUnits, decimals);
  else throw new Error("Provide AMOUNT (wei) or AMOUNT_UNITS (+ optional DECIMALS, default 18)");

  const [signer] = await ethers.getSigners();
  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Caller:", signer.address);
  console.log("Pool:", poolAddr);
  console.log("Token:", tokenAddr);
  console.log("Amount:", amount.toString(), "wei (~", ethers.formatUnits(amount, decimals), "units)");
  console.log("Commitment:", commitment);

  const token = await ethers.getContractAt("DemoERC20", tokenAddr, signer);
  const pool = await ethers.getContractAt("PrivacyPool", poolAddr, signer);

  // Guard: MJPY enforces spender restrictions for approve(owner->pool). Warn early.
  const MJPY = "0x115e91ef61ae86FbECa4b5637FD79C806c331632".toLowerCase();
  if (tokenAddr.toLowerCase() === MJPY) {
    throw new Error(
      "ERC20_TOKEN_ADDRESS points to MJPY. approve(owner->pool) will revert unless the pool is whitelisted as a spender. Use a demo token or request whitelisting."
    );
  }

  console.log("Approving allowance...");
  const tx1 = await token.approve(poolAddr, amount);
  console.log("Approve tx:", tx1.hash);
  await tx1.wait();

  console.log("Depositing...");
  const tx2 = await pool.deposit(amount, commitment);
  console.log("Deposit tx:", tx2.hash);
  await tx2.wait();
  console.log("Deposit complete.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
