import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xAf7a1C0c8FFdAb76BfE73156f78c2E18d248c01e";
  const marketId = parseInt(process.env.MARKET_ID || process.argv[2] || "0");

  console.log("⚖️  Settling market...");
  console.log("Contract:", contractAddress);
  console.log("Market ID:", marketId);

  const [signer] = await ethers.getSigners();
  console.log("Settler:", signer.address);

  // Connect to contract
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Check market info
  const marketInfo = await contract.getMarketInfo(marketId);
  console.log("\n📊 Market Status:");
  console.log("  Question:", marketInfo[0]);
  console.log("  Settled:", marketInfo[3] ? "YES ✅" : "NO ❌");
  console.log("  Total Bets:", marketInfo[4].toString());
  console.log("  Total Escrow:", ethers.formatEther(marketInfo[5]), "ETH");

  if (marketInfo[3]) {
    console.log("\n⚠️  Market already settled!");
    
    // Show results
    const pools = await contract.getDecryptedPools(marketId);
    console.log("\n🏆 Settlement Results:");
    console.log("  YES Pool:", pools[0].toString(), "wei");
    console.log("  NO Pool:", pools[1].toString(), "wei");
    console.log("  Winner:", pools[2] ? "YES" : "NO");
    return;
  }

  // Settle market using FHE.getDecryptResultSafe()
  console.log("\n🔄 Calling settleMarket()...");
  console.log("   This will use FHE.getDecryptResultSafe() to retrieve decrypted values");
  
  try {
    const tx = await contract.settleMarket(marketId);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    if (!receipt) {
      console.error("Transaction failed");
      return;
    }

    console.log("✅ Market settled in block:", receipt.blockNumber);

    // Check for MarketSettled event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "MarketSettled";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      const winningOutcome = parsed?.args[1];
      const yesPool = parsed?.args[2];
      const noPool = parsed?.args[3];

      console.log("\n🏆 Settlement Results:");
      console.log("  YES Pool:", yesPool.toString(), "wei", `(${ethers.formatEther(yesPool)} ETH)`);
      console.log("  NO Pool:", noPool.toString(), "wei", `(${ethers.formatEther(noPool)} ETH)`);
      console.log("  Winner:", winningOutcome ? "YES ✅" : "NO ✅");
      console.log("\n💡 Winners can now withdraw their payouts!");
      console.log(`   node scripts/withdraw-payout.ts ${marketId} <BET_INDEX>`);
    }
  } catch (error: any) {
    if (error.message.includes("not decrypted yet")) {
      console.log("\n⏳ Decryption not ready yet. The CoFHE MPC network is still processing.");
      console.log("   Wait 30-60 seconds and try again:");
      console.log(`   node scripts/settle-market.ts ${marketId}`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
