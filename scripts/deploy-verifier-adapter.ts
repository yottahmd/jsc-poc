import { ethers } from "hardhat";

/**
 * Deploys VerifierAdapter pointing to an already deployed standard Verifier.
 * Env:
 *  - UNDERLYING_VERIFIER (required): address of `Verifier` contract
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const underlying = (process.env.UNDERLYING_VERIFIER || "").trim();
  if (!ethers.isAddress(underlying)) throw new Error("UNDERLYING_VERIFIER is required and must be an address");

  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("Underlying Verifier:", underlying);

  const Adapter = await ethers.getContractFactory("VerifierAdapter");
  const adapter = await Adapter.deploy(underlying);
  await adapter.waitForDeployment();
  console.log("VerifierAdapter deployed at:", await adapter.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

