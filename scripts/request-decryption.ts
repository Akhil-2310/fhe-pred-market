import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xAf7a1C0c8FFdAb76BfE73156f78c2E18d248c01e";
  const marketId = parseInt(process.env.MARKET_ID || process.argv[2] || "0");

  console.log("🔓 Requesting on-chain decryption...");
  console.log("Contract:", contractAddress);
  console.log("Market ID:", marketId);

  const [signer] = await ethers.getSigners();
  console.log("Requester:", signer.address);

  // Connect to contract
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Check market info
  const marketInfo = await contract.getMarketInfo(marketId);
  const closeTime = Number(marketInfo[1]);
  const currentTime = Math.floor(Date.now() / 1000);
  
  console.log("\n📊 Market Status:");
  console.log("  Close Time:", new Date(closeTime * 1000).toISOString());
  console.log("  Current Time:", new Date(currentTime * 1000).toISOString());
  console.log("  Market Closed:", currentTime >= closeTime ? "YES ✅" : "NO ❌");
  console.log("  Total Bets:", marketInfo[4].toString());
  console.log("  Total Escrow:", ethers.formatEther(marketInfo[5]), "ETH");

  if (currentTime < closeTime) {
    console.log("\n⚠️  Market is not closed yet. Wait until close time.");
    console.log(`   Time remaining: ${Math.floor((closeTime - currentTime) / 60)} minutes`);
    return;
  }

  // Request decryption via CoFHE MPC network
  console.log("\n🔄 Sending decryption request to CoFHE MPC network...");
  console.log("   This will call FHE.decrypt() on encrypted YES and NO pools");
  
  const tx = await contract.requestDecryption(marketId);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  if (!receipt) {
    console.error("Transaction failed");
    return;
  }

  console.log("✅ Decryption requested in block:", receipt.blockNumber);

  // Check for DecryptionRequested event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "DecryptionRequested";
    } catch {
      return false;
    }
  });

  if (event) {
    console.log("\n🎯 Decryption Request Confirmed");
    console.log("   The CoFHE MPC threshold network is now decrypting the pools");
    console.log("   This may take a few moments...");
    console.log("\n💡 Next step: Wait for decryption to complete, then run:");
    console.log(`   node scripts/settle-market.ts ${marketId}`);
    console.log("\n   You can try settling immediately, or wait 30-60 seconds for better chance of success");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
