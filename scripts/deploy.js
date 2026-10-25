import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying TenderVault contract with account:", deployerAddress);

  const TenderVault = await hre.ethers.getContractFactory("TenderVault");
  const tenderVault = await TenderVault.deploy();

  await tenderVault.waitForDeployment();

  const contractAddress = await tenderVault.getAddress();

  console.log("-----------------------------------------------");
  console.log("TenderVault deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer / Nodal Authority: ${deployerAddress}`);
  console.log("-----------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
