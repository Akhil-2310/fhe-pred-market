import { ethers } from "hardhat";

/**
 * Unsafe withdrawal - tries immediately without checking if decryption is ready
 * Will revert with clear error if decryption not complete
 * Use this to keep trying until decryption completes
 */
async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xE2C27D3b4CB0Df767a354Efdc621b789b067D32B";
  const marketId = parseInt(process.env.MARKET_ID || process.argv[2] || "0");
  const betIndex = parseInt(process.env.BET_INDEX || process.argv[3] || "0");

  console.log("💰 Attempting unsafe withdrawal...");
  console.log("Contract:", contractAddress);
  console.log("Market ID:", marketId);
  console.log("Bet Index:", betIndex);

  const [signer] = await ethers.getSigners();
  console.log("Withdrawer:", signer.address);

  // Connect to contract
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Check market is settled
  const marketInfo = await contract.getMarketInfo(marketId);
  if (!marketInfo[3]) {
    console.log("\n⚠️  Market is not settled yet!");
    return;
  }

  // Get settlement results
  const pools = await contract.getDecryptedPools(marketId);
  console.log("\n📊 Market Results:");
  console.log("  Question:", marketInfo[0]);
  console.log("  YES Pool:", ethers.formatEther(pools[0]), "ETH");
  console.log("  NO Pool:", ethers.formatEther(pools[1]), "ETH");
  console.log("  Winner:", pools[2] ? "YES" : "NO");

  try {
    console.log("\n🔄 Attempting withdrawal (will revert if decryption not ready)...");
    const tx = await contract.withdrawUnsafe(marketId, betIndex);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    if (!receipt) {
      console.error("Transaction failed");
      return;
    }

    console.log("✅ Withdrawal successful in block:", receipt.blockNumber);

    // Check for PayoutWithdrawn event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "PayoutWithdrawn";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      const amount = parsed?.args[3];
      console.log("\n💰 Payout received:", ethers.formatEther(amount), "ETH");
      console.log("🎉 Congratulations on your winning bet!");
    }

    // Show updated balance
    const newBalance = await ethers.provider.getBalance(signer.address);
    console.log("\n💳 Your new balance:", ethers.formatEther(newBalance), "ETH");

  } catch (error: any) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes("bet did not win")) {
      console.log("\n❌ This bet lost - only winning bets can withdraw");
    } else if (errorMsg.includes("not your bet")) {
      console.log("\n❌ This bet doesn't belong to you");
    } else if (errorMsg.includes("already withdrawn")) {
      console.log("\n❌ This bet has already been withdrawn");
    } else if (errorMsg.includes("no payout") || errorMsg.includes("no winning pool")) {
      console.log("\n❌ No payout available");
    } else if (errorMsg.includes("revert") || errorMsg.includes("execution reverted")) {
      console.log("\n⏳ Bet outcome not decrypted yet by MPC network");
      console.log("   The decryption is still in progress");
      console.log("   Try again in 30-60 seconds:");
      console.log(`   MARKET_ID=${marketId} BET_INDEX=${betIndex} MARKET_CONTRACT=${contractAddress} npx hardhat run scripts/withdraw-unsafe.ts --network sepolia`);
    } else {
      console.error("\n❌ Error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
