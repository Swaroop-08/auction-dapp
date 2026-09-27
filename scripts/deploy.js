import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying AuctionX contract with account:", deployerAddress);

  const AuctionX = await hre.ethers.getContractFactory("AuctionX");
  const auction = await AuctionX.deploy();

  await auction.waitForDeployment();

  const contractAddress = await auction.getAddress();

  console.log("-----------------------------------------------");
  console.log("AuctionX deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer / Genesis Seller: ${deployerAddress}`);
  console.log("-----------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
