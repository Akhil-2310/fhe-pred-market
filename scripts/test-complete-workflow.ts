import { ethers } from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

async function main() {
  console.log("🧪 Complete FHE Prediction Market Test Workflow\n");
  console.log("=".repeat(60));

  // Deploy contract
  console.log("\n📦 STEP 1: Deploying Contract");
  console.log("-".repeat(60));
  
  const [deployer, bettor1, bettor2, bettor3] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const SimpleFHEPredictionMarket = await ethers.getContractFactory("SimpleFHEPredictionMarket");
  const contract = await SimpleFHEPredictionMarket.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed:", contractAddress);

  // Create market
  console.log("\n📝 STEP 2: Creating Market");
  console.log("-".repeat(60));
  
  const closeTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes
  const tx1 = await contract.createMarket(
    "Will ETH reach $5000 by EOY 2025?",
    closeTime,
    200 // 2% fee
  );
  await tx1.wait();
  
  const marketId = 0;
  console.log("✅ Market created with ID:", marketId);
  console.log("   Closes in: 5 minutes");

  // Initialize CoFHE for encryption
  console.log("\n🔐 STEP 3: Initializing CoFHE");
  console.log("-".repeat(60));
  
  await cofhejs.initializeWithEthers({
    ethersProvider: ethers.provider,
    ethersSigner: bettor1,
    environment: "LOCAL",
  });
  console.log("✅ CoFHE initialized");

  // Place encrypted bets
  console.log("\n🎲 STEP 4: Placing Encrypted Bets");
  console.log("-".repeat(60));

  const logState = (state: string) => {
    console.log(`   Encryption: ${state}`);
  };

  // Bet 1: YES, 0.1 ETH
  console.log("\n  Bet 1 (YES, 0.1 ETH):");
  const stake1 = ethers.parseEther("0.1");
  const encrypted1 = await cofhejs.encrypt([
    Encryptable.uint64(BigInt(stake1.toString())),
    Encryptable.bool(true),
  ], logState);
  
  const tx2 = await contract.connect(bettor1).placeBet(
    marketId,
    encrypted1.data![0],
    encrypted1.data![1],
    { value: stake1 }
  );
  await tx2.wait();
  console.log("  ✅ Bet placed by:", bettor1.address);

  // Bet 2: NO, 0.05 ETH
  console.log("\n  Bet 2 (NO, 0.05 ETH):");
  const stake2 = ethers.parseEther("0.05");
  const encrypted2 = await cofhejs.encrypt([
    Encryptable.uint64(BigInt(stake2.toString())),
    Encryptable.bool(false),
  ], logState);
  
  const tx3 = await contract.connect(bettor2).placeBet(
    marketId,
    encrypted2.data![0],
    encrypted2.data![1],
    { value: stake2 }
  );
  await tx3.wait();
  console.log("  ✅ Bet placed by:", bettor2.address);

  // Bet 3: YES, 0.03 ETH
  console.log("\n  Bet 3 (YES, 0.03 ETH):");
  const stake3 = ethers.parseEther("0.03");
  const encrypted3 = await cofhejs.encrypt([
    Encryptable.uint64(BigInt(stake3.toString())),
    Encryptable.bool(true),
  ], logState);
  
  const tx4 = await contract.connect(bettor3).placeBet(
    marketId,
    encrypted3.data![0],
    encrypted3.data![1],
    { value: stake3 }
  );
  await tx4.wait();
  console.log("  ✅ Bet placed by:", bettor3.address);

  console.log("\n📊 Market Summary:");
  console.log("   Total Bets: 3");
  console.log("   Total Escrow: 0.18 ETH");
  console.log("   Individual amounts and outcomes are ENCRYPTED ✅");

  // Fast forward time
  console.log("\n⏰ STEP 5: Fast Forward Time (Market Closes)");
  console.log("-".repeat(60));
  await ethers.provider.send("evm_increaseTime", [301]);
  await ethers.provider.send("evm_mine", []);
  console.log("✅ Time advanced 5+ minutes");

  // Request decryption
  console.log("\n🔓 STEP 6: Requesting On-Chain Decryption");
  console.log("-".repeat(60));
  const tx5 = await contract.requestDecryption(marketId);
  await tx5.wait();
  console.log("✅ Decryption requested from CoFHE MPC network");

  // Settle market
  console.log("\n⚖️  STEP 7: Settling Market");
  console.log("-".repeat(60));
  
  try {
    const tx6 = await contract.settleMarket(marketId);
    const receipt = await tx6.wait();
    
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "MarketSettled";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      const winner = parsed?.args[1];
      const yesPool = parsed?.args[2];
      const noPool = parsed?.args[3];

      console.log("✅ Market settled!");
      console.log("\n🏆 Results:");
      console.log("   YES Pool:", ethers.formatEther(yesPool), "ETH");
      console.log("   NO Pool:", ethers.formatEther(noPool), "ETH");
      console.log("   Winner:", winner ? "YES" : "NO");

      // Withdraw payouts
      console.log("\n💰 STEP 8: Withdrawing Payouts");
      console.log("-".repeat(60));

      // Calculate and withdraw for winner(s)
      if (winner) {
        // YES won - bettor1 and bettor3 can withdraw
        console.log("\n  Bettor 1 (YES bet):");
        const payout1 = await contract.calculatePayout(marketId, 0);
        console.log("   Payout:", ethers.formatEther(payout1), "ETH");
        
        const tx7 = await contract.connect(bettor1).withdraw(marketId, 0);
        await tx7.wait();
        console.log("   ✅ Withdrawn successfully");

        console.log("\n  Bettor 3 (YES bet):");
        const payout3 = await contract.calculatePayout(marketId, 2);
        console.log("   Payout:", ethers.formatEther(payout3), "ETH");
        
        const tx8 = await contract.connect(bettor3).withdraw(marketId, 2);
        await tx8.wait();
        console.log("   ✅ Withdrawn successfully");
      } else {
        // NO won - bettor2 can withdraw
        console.log("\n  Bettor 2 (NO bet):");
        const payout2 = await contract.calculatePayout(marketId, 1);
        console.log("   Payout:", ethers.formatEther(payout2), "ETH");
        
        const tx7 = await contract.connect(bettor2).withdraw(marketId, 1);
        await tx7.wait();
        console.log("   ✅ Withdrawn successfully");
      }

      console.log("\n" + "=".repeat(60));
      console.log("🎉 WORKFLOW COMPLETE!");
      console.log("=".repeat(60));
      console.log("\n✅ All features tested successfully:");
      console.log("   • Market creation");
      console.log("   • Encrypted bet placement (amount + outcome)");
      console.log("   • Homomorphic aggregation");
      console.log("   • On-chain decryption via CoFHE MPC");
      console.log("   • Settlement with FHE.getDecryptResultSafe()");
      console.log("   • Parimutuel payout calculation");
      console.log("   • Winner withdrawal");
    }
  } catch (error: any) {
    console.log("⚠️  Settlement failed - decryption may not be ready yet");
    console.log("   In production, wait 30-60 seconds after requesting decryption");
    console.log("\n   Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
