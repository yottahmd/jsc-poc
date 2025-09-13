import { ethers } from "hardhat";

/**
 * Deploys a mock Groth16 verifier for demo mode.
 * Returns an address suitable for VERIFIER_ADDRESS.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);

  const Verifier = await ethers.getContractFactory("MockVerifierGroth16");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("MockVerifierGroth16 deployed at:", await verifier.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

