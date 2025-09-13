import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);

  const Verifier = await ethers.getContractFactory("SimpleMembershipVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("SimpleMembershipVerifier deployed at:", await verifier.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

