import { ethers } from "hardhat";

/**
 * Mints demo ERC20 to an address (owner only).
 *
 * Env:
 *  - ERC20_TOKEN_ADDRESS (required): address of DemoERC20 (overrides .env if set inline)
 *  - TO (optional): recipient address; defaults to signer (PRIVATE_KEY)
 *  - AMOUNT (one of):
 *      - AMOUNT (wei) e.g., 1000000000000000000 for 1 token
 *      - or AMOUNT_UNITS (human) with DECIMALS (default 18) e.g., AMOUNT_UNITS=1 DECIMALS=18
 */
async function main() {
  const demo = (process.env.ERC20_TOKEN_ADDRESS || "").trim();
  if (!ethers.isAddress(demo)) throw new Error("ERC20_TOKEN_ADDRESS is required and must be an address");
  // Guard: prevent accidental mint attempts on MJPY (compliant token)
  const MJPY = "0x115e91ef61ae86FbECa4b5637FD79C806c331632".toLowerCase();
  if (demo.toLowerCase() === MJPY) {
    throw new Error(
      "ERC20_TOKEN_ADDRESS points to MJPY. You cannot mint MJPY. Use deploy:demoerc20:kaigan and run this script with ERC20_TOKEN_ADDRESS=0x<Demo>"
    );
  }

  const [signer] = await ethers.getSigners();
  const toEnv = (process.env.TO || "").trim();
  const to = toEnv && ethers.isAddress(toEnv) ? toEnv : signer.address;

  let amount: bigint;
  const amountWei = (process.env.AMOUNT || "").trim();
  const amountUnits = (process.env.AMOUNT_UNITS || "").trim();
  const decimals = parseInt(process.env.DECIMALS || "18", 10);
  if (amountWei) {
    amount = BigInt(amountWei);
  } else if (amountUnits) {
    amount = ethers.parseUnits(amountUnits, decimals);
  } else {
    throw new Error("Provide AMOUNT (wei) or AMOUNT_UNITS (+ optional DECIMALS, default 18)");
  }
  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Owner:", signer.address);
  console.log("Demo token:", demo);
  console.log("Minting:", amount.toString(), "wei (~", ethers.formatUnits(amount, decimals), "units) to", to);

  const token = await ethers.getContractAt("DemoERC20", demo, signer);
  const tx = await token.mint(to, amount);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("Minted.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
