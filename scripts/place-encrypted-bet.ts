import { ethers } from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

async function main() {
  const contractAddress = process.env.MARKET_CONTRACT || "0xAf7a1C0c8FFdAb76BfE73156f78c2E18d248c01e";
  const marketId = parseInt(process.env.MARKET_ID || "0");
  
  // Bet parameters - read from env or argv
  const stakeAmount = process.env.STAKE_AMOUNT || process.argv[2] || "0.01"; // ETH amount
  const outcome = process.env.OUTCOME || process.argv[3] || "true"; // "true" for YES, "false" for NO
  const outcomeValue = outcome.toLowerCase() === "true";

  console.log("🎲 Placing encrypted bet...");
  console.log("Contract:", contractAddress);
  console.log("Market ID:", marketId);
  console.log("Stake:", stakeAmount, "ETH");
  console.log("Outcome:", outcomeValue ? "YES" : "NO");

  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  console.log("Bettor:", signer.address);

  // Initialize cofhejs with ethers
  console.log("\n🔐 Initializing CoFHE encryption...");
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: "TESTNET", // Using Fhenix testnet
  });

  const logState = (state: string) => {
    console.log(`   Encrypt State: ${state}`);
  };

  // Convert stake to wei (as uint64)
  const stakeWei = ethers.parseEther(stakeAmount);
  const stakeUint64 = stakeWei.toString(); // Keep as string for cofhejs

  console.log("\n🔒 Encrypting bet data...");
  console.log("   Stake (wei):", stakeUint64);
  console.log("   Outcome (bool):", outcomeValue);

  // Encrypt both stake and outcome
  const encryptedData = await cofhejs.encrypt([
    Encryptable.uint64(BigInt(stakeUint64)),
    Encryptable.bool(outcomeValue),
  ], logState);

  const encryptedStake = encryptedData.data[0];
  const encryptedOutcome = encryptedData.data[1];

  console.log("✅ Encryption complete!");
  console.log("   Encrypted Stake ctHash:", encryptedStake.ctHash.toString());
  console.log("   Encrypted Outcome ctHash:", encryptedOutcome.ctHash.toString());

  // Connect to contract
  const contract = await ethers.getContractAt("SimpleFHEPredictionMarket", contractAddress);

  // Place bet
  console.log("\n🔄 Placing bet on blockchain...");
  const tx = await contract.placeBet(
    marketId,
    encryptedStake,
    encryptedOutcome,
    { value: stakeWei }
  );
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Bet placed successfully in block:", receipt?.blockNumber);

  // Get bet index from event
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
    console.log("\n🎯 Your bet index:", betIndex.toString());
    console.log("   Market ID:", marketId);
    console.log("   Bettor:", signer.address);
    console.log("   Escrow:", stakeAmount, "ETH");
    console.log("\n💡 Save your bet index for withdrawal after settlement!");
    console.log(`export BET_INDEX=${betIndex.toString()}`);
  }

  // Display updated market info
  const marketInfo = await contract.getMarketInfo(marketId);
  console.log("\n📊 Updated Market Info:");
  console.log("   Total Bets:", marketInfo[4].toString());
  console.log("   Total Escrow:", ethers.formatEther(marketInfo[5]), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
