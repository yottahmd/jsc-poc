import { ethers } from "hardhat";

/**
 * Deploys PrivacyPool with MJPY, SBT, verifier, denominations, inclusion delay.
 *
 * Env vars:
 *  - ERC20_TOKEN_ADDRESS (default MJPY on Kaigan): 0x115e91ef61ae86FbECa4b5637FD79C806c331632
 *  - SBT_CONTRACT_ADDRESS (required): Mizuhiki SBT contract
 *  - VERIFIER_ADDRESS (required): Groth16 verifier or adapter implementing IVerifierGroth16
 *  - OWNER_ADDRESS (optional): pool owner (default deployer)
 *  - DENOMS_UNITS (optional): comma-separated whole-token amounts, default "1,10,100"
 *  - ERC20_DECIMALS (optional): token decimals, default "18"
 *  - INCLUSION_DELAY_BLOCKS (optional): default "20"
 *  - GATE_MODE (optional): "caller" or "owner" (default "owner")
 *  - STRICT_RECIPIENT (optional): "1" to require recipient SBT (default "0")
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const DEFAULT_MJPY = "0x115e91ef61ae86FbECa4b5637FD79C806c331632";
  const tokenAddr = (process.env.ERC20_TOKEN_ADDRESS || DEFAULT_MJPY).trim();
  const sbtAddr = (process.env.SBT_CONTRACT_ADDRESS || "").trim();
  const verifierAddr = (process.env.VERIFIER_ADDRESS || "").trim();
  const owner = (process.env.OWNER_ADDRESS || deployer.address).trim();
  const decimals = parseInt(process.env.ERC20_DECIMALS || "18", 10);
  const inclusionDelayBlocks = BigInt(process.env.INCLUSION_DELAY_BLOCKS || "20");
  const gateModeStr = (process.env.GATE_MODE || "owner").toLowerCase();
  const gateMode = gateModeStr === "caller" ? 0 : 1; // 0=CallerHoldsSBT, 1=OwnerHoldsSBT
  const strictRecipient = (process.env.STRICT_RECIPIENT || "0") === "1";

  if (!ethers.isAddress(tokenAddr)) throw new Error("ERC20_TOKEN_ADDRESS invalid");
  if (!ethers.isAddress(sbtAddr)) throw new Error("SBT_CONTRACT_ADDRESS is required and must be an address");
  if (!ethers.isAddress(verifierAddr)) throw new Error("VERIFIER_ADDRESS is required and must be an address");
  if (!ethers.isAddress(owner)) throw new Error("OWNER_ADDRESS invalid");

  const denomsUnits = (process.env.DENOMS_UNITS || "1,10,100").split(",").map((s) => s.trim()).filter(Boolean);
  const denoms = denomsUnits.map((u) => ethers.parseUnits(u, decimals));

  console.log("Network:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);
  console.log("Token:", tokenAddr);
  console.log("SBT:", sbtAddr);
  console.log("Verifier:", verifierAddr);
  console.log("Denoms (units):", denomsUnits.join(", "));
  console.log("Inclusion delay (blocks):", inclusionDelayBlocks.toString());
  console.log("Gate mode:", gateMode === 0 ? "caller" : "owner");
  console.log("Strict recipient:", strictRecipient);

  const PrivacyPool = await ethers.getContractFactory("PrivacyPool");
  const pool = await PrivacyPool.deploy(
    owner,
    tokenAddr,
    sbtAddr,
    verifierAddr,
    denoms,
    inclusionDelayBlocks,
    gateMode,
    strictRecipient,
  );
  await pool.waitForDeployment();

  console.log("PrivacyPool deployed at:", await pool.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
