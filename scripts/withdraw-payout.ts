import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xAf7a1C0c8FFdAb76BfE73156f78c2E18d248c01e";
  const marketId = parseInt(process.env.MARKET_ID || process.argv[2] || "0");
  const betIndex = parseInt(process.env.BET_INDEX || process.argv[3] || "0");

  console.log("💰 Withdrawing payout...");
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
    console.log("   Run: node scripts/settle-market.ts", marketId);
    return;
  }

  // Get settlement results
  const pools = await contract.getDecryptedPools(marketId);
  console.log("\n📊 Market Results:");
  console.log("  Question:", marketInfo[0]);
  console.log("  YES Pool:", ethers.formatEther(pools[0]), "ETH");
  console.log("  NO Pool:", ethers.formatEther(pools[1]), "ETH");
  console.log("  Winner:", pools[2] ? "YES" : "NO");

  // Check current payout (this may trigger decryption of the specific bet)
  console.log("\n🔍 Calculating your payout...");
  try {
    const payout = await contract.calculatePayout(marketId, betIndex);
    
    if (payout === 0n) {
      console.log("❌ No payout available for this bet");
      console.log("   Either you didn't win, or the bet is already withdrawn");
      return;
    }

    console.log("✅ Payout available:", ethers.formatEther(payout), "ETH");

    // Withdraw
    console.log("\n🔄 Withdrawing payout...");
    const tx = await contract.withdraw(marketId, betIndex);
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
    if (error.message.includes("No payout available")) {
      console.log("❌ No payout available for this bet");
    } else if (error.message.includes("Not your bet")) {
      console.log("❌ This bet doesn't belong to you");
    } else if (error.message.includes("Already withdrawn")) {
      console.log("❌ This bet has already been withdrawn");
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
