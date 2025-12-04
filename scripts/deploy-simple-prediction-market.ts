import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying SimpleFHEPredictionMarket...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy contract
  const SimpleFHEPredictionMarket = await ethers.getContractFactory("SimpleFHEPredictionMarket");
  const contract = await SimpleFHEPredictionMarket.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ SimpleFHEPredictionMarket deployed to:", address);
  console.log("\nSave this address for future tasks!");
  console.log(`export MARKET_CONTRACT=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
