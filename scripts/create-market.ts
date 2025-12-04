import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xAf7a1C0c8FFdAb76BfE73156f78c2E18d248c01e";
  
  // Market parameters
  const question = process.env.QUESTION || process.argv[2] || "Will ETH reach $5000 by end of December 2025?";
  const durationMinutes = parseInt(process.env.DURATION || process.argv[3] || "60"); // Default 60 minutes
  const feeBps = parseInt(process.env.FEE_BPS || process.argv[4] || "200"); // Default 2% fee (200 basis points)

  console.log("📝 Creating prediction market...");
  console.log("Contract:", contractAddress);
  console.log("Question:", question);
  console.log("Duration:", durationMinutes, "minutes");
  console.log("Fee:", feeBps / 100, "%");

  const [signer] = await ethers.getSigners();
  console.log("Creator:", signer.address);

  // Connect to contract
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Calculate close time
  const closeTime = Math.floor(Date.now() / 1000) + (durationMinutes * 60);
  const closeDate = new Date(closeTime * 1000);
  console.log("Close time:", closeDate.toISOString());

  // Create market
  console.log("\n🔄 Sending transaction...");
  const tx = await contract.createMarket(question, closeTime, feeBps);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

  // Get market ID from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = contract.interface.parseLog(event);
    const marketId = parsed?.args[0];
    console.log("\n🎯 Market created with ID:", marketId.toString());
    console.log(`\nTo place a bet, run:`);
    console.log(`export MARKET_ID=${marketId.toString()}`);
    console.log(`node scripts/place-encrypted-bet.js`);
  }

  // Fetch and display market info
  const marketInfo = await contract.getMarketInfo(event ? contract.interface.parseLog(event).args[0] : 0);
  console.log("\n📊 Market Info:");
  console.log("  Question:", marketInfo[0]);
  console.log("  Close Time:", new Date(Number(marketInfo[1]) * 1000).toISOString());
  console.log("  Fee:", Number(marketInfo[2]) / 100, "%");
  console.log("  Settled:", marketInfo[3]);
  console.log("  Total Bets:", marketInfo[4].toString());
  console.log("  Total Escrow:", ethers.formatEther(marketInfo[5]), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
