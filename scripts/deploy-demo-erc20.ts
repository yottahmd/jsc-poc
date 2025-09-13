import { ethers } from "hardhat";

/**
 * Deploys a simple demo ERC20 for testing PrivacyPool deposits.
 *
 * Env (optional):
 *  - DEMO_NAME (default: Demo Token)
 *  - DEMO_SYMBOL (default: DEMO)
 *  - DEMO_INITIAL (wei) OR DEMO_INITIAL_UNITS (human) with DECIMALS (default 18)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const name = process.env.DEMO_NAME || "Demo Token";
  const symbol = process.env.DEMO_SYMBOL || "DEMO";
  const dec = parseInt(process.env.DECIMALS || "18", 10);
  const initWei = (process.env.DEMO_INITIAL || "").trim();
  const initUnits = (process.env.DEMO_INITIAL_UNITS || "").trim();
  const initial = initWei ? BigInt(initWei) : (initUnits ? ethers.parseUnits(initUnits, dec) : ethers.parseUnits("1000000", dec));

  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log(
    `Deploying DemoERC20 ${name} (${symbol}) with initial:`,
    initial.toString(), `(wei) ~`, ethers.formatUnits(initial, dec), `(units)`
  );

  const DemoERC20 = await ethers.getContractFactory("DemoERC20");
  const token = await DemoERC20.deploy(name, symbol, initial);
  await token.waitForDeployment();
  console.log("DemoERC20 deployed at:", await token.getAddress());
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
