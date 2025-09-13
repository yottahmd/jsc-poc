import { ethers } from "hardhat";

/**
 * Deploys a SmartAccount with the specified owner.
 *
 * Env vars (optional):
 *  - OWNER_ADDRESS: address to set as initial owner (defaults to first signer)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = (process.env.OWNER_ADDRESS || deployer.address).trim();

  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);

  const SmartAccount = await ethers.getContractFactory("SmartAccount");
  const sca = await SmartAccount.deploy(owner);
  await sca.waitForDeployment();

  console.log("SmartAccount deployed at:", await sca.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

