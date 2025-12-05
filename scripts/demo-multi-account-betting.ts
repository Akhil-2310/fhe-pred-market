import { ethers } from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

/**
 * Demo script: Place bets from multiple accounts to show different participants
 * This creates a more realistic demo with multiple bettors on different sides
 * 
 * Usage: MARKET_ID=1 npx hardhat run scripts/demo-multi-account-betting.ts --network sepolia
 */

interface BetConfig {
  accountIndex: number;
  stakeAmount: string;
  outcome: boolean;
  nickname: string;
}

async function placeBetFromAccount(
  contract: any,
  provider: any,
  signer: any,
  marketId: number,
  config: BetConfig
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎲 Bettor: ${config.nickname} (Account ${config.accountIndex})`);
  console.log(`${"=".repeat(60)}`);
  console.log("Address:", signer.address);
  console.log("Stake:", config.stakeAmount, "ETH");
  console.log("Prediction:", config.outcome ? "YES ✅" : "NO ❌");

  // Check balance
  const balance = await provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Initialize cofhejs for this signer
  console.log("\n🔐 Initializing CoFHE encryption...");
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: "TESTNET",
  });

  const logState = (state: string) => {
    console.log(`   ${state}`);
  };

  // Convert stake to wei
  const stakeWei = ethers.parseEther(config.stakeAmount);
  const stakeUint64 = stakeWei.toString();

  console.log("🔒 Encrypting bet data...");
  const encryptedData = await cofhejs.encrypt([
    Encryptable.uint64(BigInt(stakeUint64)),
    Encryptable.bool(config.outcome),
  ], logState);

  const encryptedStake = encryptedData.data![0];
  const encryptedOutcome = encryptedData.data![1];

  console.log("✅ Encryption complete!");

  // Place bet
  console.log("\n🔄 Submitting to blockchain...");
  const tx = await contract.connect(signer).placeBet(
    marketId,
    encryptedStake,
    encryptedOutcome,
    { value: stakeWei }
  );
  console.log("TX:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Confirmed in block:", receipt?.blockNumber);

  // Get bet index
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "BetPlaced";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = contract.interface.parseLog(event);
    const betIndex = parsed?.args[1];
    console.log("📝 Bet Index:", betIndex.toString());
  }
}

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0x77958F65c64E0F165A7849B8Daf67eE0824E00C5";
  const marketId = parseInt(process.env.MARKET_ID || "1");

  console.log("🎪 FHE Prediction Market - Multi-Account Demo");
  console.log("=" .repeat(60));
  console.log("Contract:", contractAddress);
  console.log("Market ID:", marketId);
  console.log("=" .repeat(60));

  const signers = await ethers.getSigners();
  const provider = ethers.provider;
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Check how many accounts are available
  console.log(`\n📋 Available accounts: ${signers.length}`);
  for (let i = 0; i < Math.min(signers.length, 4); i++) {
    const balance = await provider.getBalance(signers[i].address);
    console.log(`   Account ${i}: ${signers[i].address} (${ethers.formatEther(balance)} ETH)`);
  }

  // Get market info
  const marketInfo = await contract.getMarketInfo(marketId);
  console.log("\n📊 Current Market State:");
  console.log("   Question:", marketInfo[0]);
  console.log("   Total Bets:", marketInfo[4].toString());
  console.log("   Total Escrow:", ethers.formatEther(marketInfo[5]), "ETH");
  console.log("   Settled:", marketInfo[3] ? "Yes" : "No");

  // Define bets from different accounts
  const bets: BetConfig[] = [
    { accountIndex: 0, stakeAmount: "0.012", outcome: true, nickname: "Alice (Optimist)" },
    { accountIndex: 1, stakeAmount: "0.008", outcome: false, nickname: "Bob (Skeptic)" },
    { accountIndex: 2, stakeAmount: "0.015", outcome: true, nickname: "Charlie (Believer)" },
    { accountIndex: 0, stakeAmount: "0.005", outcome: false, nickname: "Alice (Hedging)" },
  ];

  // Filter to only use available accounts
  const availableBets = bets.filter(bet => bet.accountIndex < signers.length);
  
  console.log(`\n🎯 Placing ${availableBets.length} bets from ${new Set(availableBets.map(b => b.accountIndex)).size} different accounts...\n`);

  // Place each bet
  for (const bet of availableBets) {
    try {
      await placeBetFromAccount(
        contract,
        provider,
        signers[bet.accountIndex],
        marketId,
        bet
      );
      
      // Wait a bit between bets
      console.log("\n⏳ Waiting 3 seconds before next bet...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error(`❌ Error placing bet for ${bet.nickname}:`, error.message);
    }
  }

  // Final market state
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 FINAL MARKET STATE");
  console.log(`${"=".repeat(60)}`);
  
  const finalInfo = await contract.getMarketInfo(marketId);
  console.log("Total Bets Placed:", finalInfo[4].toString());
  console.log("Total Escrow:", ethers.formatEther(finalInfo[5]), "ETH");
  
  console.log("\n✅ Demo complete! Multiple accounts have placed encrypted bets.");
  console.log("💡 Note: All bet amounts and predictions are encrypted on-chain.");
  console.log("🔐 Only after settlement will the pool totals be revealed via MPC decryption.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
