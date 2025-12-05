import { ethers } from "hardhat";

/**
 * Fund multiple test accounts from the main account
 * This helps set up accounts for multi-account betting demos
 * 
 * Usage: npx hardhat run scripts/fund-test-accounts.ts --network sepolia
 */

async function main() {
  const signers = await ethers.getSigners();
  const mainAccount = signers[0];
  const provider = ethers.provider;

  console.log("💰 Funding Test Accounts for Multi-Account Demo");
  console.log("=" .repeat(60));
  console.log("Main Account:", mainAccount.address);

  const mainBalance = await provider.getBalance(mainAccount.address);
  console.log("Main Balance:", ethers.formatEther(mainBalance), "ETH");

  if (signers.length < 2) {
    console.log("\n⚠️  Only 1 account configured in hardhat.config.ts");
    console.log("💡 To use multiple accounts, add more PRIVATE_KEY entries to .env:");
    console.log("   PRIVATE_KEY=<main account>");
    console.log("   PRIVATE_KEY_2=<second account>");
    console.log("   PRIVATE_KEY_3=<third account>");
    console.log("\n   Then update hardhat.config.ts to include them.");
    return;
  }

  console.log(`\n📋 Found ${signers.length} accounts configured`);
  
  // Amount to send to each account (enough for a few bets + gas)
  const fundAmount = ethers.parseEther("0.2"); // 0.2 ETH per account
  
  console.log(`\n💸 Funding amount: ${ethers.formatEther(fundAmount)} ETH per account`);
  console.log(`   (Enough for ~15-20 bets at 0.01 ETH each + gas)\n`);

  // Skip first account (that's the main/funding account)
  for (let i = 1; i < signers.length; i++) {
    const account = signers[i];
    const currentBalance = await provider.getBalance(account.address);
    
    console.log(`Account ${i}: ${account.address}`);
    console.log(`   Current balance: ${ethers.formatEther(currentBalance)} ETH`);

    // Only fund if balance is low
    if (currentBalance < ethers.parseEther("0.15")) {
      console.log(`   ⏳ Funding...`);
      
      const tx = await mainAccount.sendTransaction({
        to: account.address,
        value: fundAmount,
      });
      
      console.log(`   TX: ${tx.hash}`);
      await tx.wait();
      
      const newBalance = await provider.getBalance(account.address);
      console.log(`   ✅ New balance: ${ethers.formatEther(newBalance)} ETH`);
    } else {
      console.log(`   ✅ Already funded (balance sufficient)`);
    }
    console.log();
  }

  // Final summary
  console.log("=" .repeat(60));
  console.log("📊 Final Account Balances:");
  console.log("=" .repeat(60));
  
  for (let i = 0; i < signers.length; i++) {
    const balance = await provider.getBalance(signers[i].address);
    const label = i === 0 ? "(Main/Funding)" : "(Test Account)";
    console.log(`Account ${i} ${label}: ${ethers.formatEther(balance)} ETH`);
  }

  console.log("\n✅ All test accounts funded and ready for demo!");
  console.log("\n💡 Next steps:");
  console.log("   1. Create a market: DURATION=300 npx hardhat run scripts/create-market.ts --network sepolia");
  console.log("   2. Run multi-account demo: MARKET_ID=X npx hardhat run scripts/demo-multi-account-betting.ts --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
