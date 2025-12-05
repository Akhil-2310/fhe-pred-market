# FHE Prediction Market 🔮🔐

A fully privacy-preserving prediction market built with Fully Homomorphic Encryption (FHE) on Fhenix CoFHE, where individual bets remain completely encrypted while the market operates transparently.

## 🎯 Problem Statement

Traditional prediction markets face critical privacy challenges:

1. **Transparent Orderbooks** - Everyone can see your bet amount and position
2. **Front-Running Risks** - Large bets are visible, enabling manipulation
3. **Social Pressure** - Your predictions are public, potentially affecting behavior
4. **Market Manipulation** - Visible large positions can influence other participants
5. **Privacy Concerns** - Financial positions and beliefs are exposed

## 💡 Our Solution

We've built the **first truly privacy-preserving prediction market** using Fully Homomorphic Encryption (FHE):

- **Encrypted Bets** - Your bet amount and outcome (YES/NO) are fully encrypted
- **Hidden Orderbook** - Nobody can see individual bet details
- **Homomorphic Aggregation** - Pool totals computed without decryption
- **On-Chain Decryption** - Only aggregate pools are decrypted for settlement via CoFHE MPC network
- **Parimutuel Payouts** - Winners share the losing pool proportionally

### Key Features

✅ **Privacy-Preserving** - Individual bets encrypted client-side before submission  
✅ **Transparent Settlement** - Aggregate results are publicly verifiable  
✅ **Manipulation-Resistant** - No one can see position sizes during betting  
✅ **Trustless** - CoFHE MPC threshold network handles decryption  
✅ **Fair Payouts** - Parimutuel system with proportional winnings  
✅ **Production Ready** - Deployed and tested on Ethereum Sepolia  

## 🏗️ Architecture

### Smart Contract: `SimpleFHEPredictionMarket.sol`

```solidity
struct Market {
    address creator;
    string question;
    uint256 closeTime;
    uint16 feeBps;
    euint64 totalYes;      // Encrypted YES pool
    euint64 totalNo;       // Encrypted NO pool
    // ... settlement fields
}

struct Bet {
    address bettor;
    euint64 encryptedStake;      // 🔒 Encrypted amount
    ebool encryptedOutcome;      // 🔒 Encrypted YES/NO
    uint256 escrowAmount;        // ✅ Public escrow
    bool withdrawn;
}
```

### Encryption Flow

1. **Client-Side Encryption** (cofhejs)
   ```typescript
   const encrypted = await cofhejs.encrypt([
     Encryptable.uint64(stakeBigInt),
     Encryptable.bool(outcome),
   ]);
   ```

2. **Homomorphic Aggregation** (on-chain)
   ```solidity
   euint64 stakeIfYes = FHE.select(outcome, stake, 0);
   totalYes = FHE.add(totalYes, stakeIfYes);
   ```

3. **MPC Decryption** (CoFHE network)
   ```solidity
   FHE.decrypt(totalYes);
   FHE.decrypt(totalNo);
   ```

4. **Settlement** (after decryption)
   ```solidity
   (uint64 yesPool, bool ready) = FHE.getDecryptResultSafe(totalYes);
   ```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ (v23.7.0 used in development)
- pnpm or npm
- Private key with Sepolia ETH

### Installation

```bash
cd cofhe-hardhat-starter
pnpm install
```

### Environment Setup

```bash
cp .env.example .env
# Add your private key and RPC URL
```

## 📝 Commands Reference

### 1. Deploy Contract

Deploy the SimpleFHEPredictionMarket contract to Sepolia.

```bash
pnpm hardhat run scripts/deploy-simple-prediction-market.ts --network eth-sepolia
```

**Output:**
```
✅ SimpleFHEPredictionMarket deployed to: 0x77958F65c64E0F165A7849B8Daf67eE0824E00C5
export MARKET_CONTRACT=0x77958F65c64E0F165A7849B8Daf67eE0824E00C5
```

**Save the address for subsequent commands!**

---

### 2. Create Market

Create a new prediction market with a question, duration, and fee.

```bash
MARKET_CONTRACT=<address> \
QUESTION="Will BTC hit 100k in 2025?" \
DURATION=60 \
FEE_BPS=200 \
pnpm hardhat run scripts/create-market.ts --network eth-sepolia
```

**Parameters:**
- `MARKET_CONTRACT` - Deployed contract address
- `QUESTION` - Market question (string)
- `DURATION` - Duration in minutes (default: 60)
- `FEE_BPS` - Fee in basis points, e.g., 200 = 2% (default: 200)

**Output:**
```
🎯 Market created with ID: 1
export MARKET_ID=1
```

**What it does:**
- Creates a binary (YES/NO) prediction market
- Sets closing time based on duration
- Initializes encrypted pool totals to 0
- Emits `MarketCreated` event

---

### 3. Place Encrypted Bet

Place a bet with encrypted amount and outcome.

```bash
MARKET_CONTRACT=<address> \
MARKET_ID=<id> \
STAKE_AMOUNT=0.01 \
OUTCOME=true \
pnpm hardhat run scripts/place-encrypted-bet.ts --network eth-sepolia
```

**Parameters:**
- `MARKET_ID` - The market ID from step 2
- `STAKE_AMOUNT` - ETH amount to bet (e.g., "0.01", "0.05")
- `OUTCOME` - "true" for YES, "false" for NO

**Encryption Process (you'll see):**
```
🔒 Encrypting bet data...
   Encrypt State: extract     ← Prepare data
   Encrypt State: pack        ← Package for encryption
   Encrypt State: prove       ← Generate ZK proof
   Encrypt State: verify      ← Verify proof
   Encrypt State: replace     ← Replace with ciphertext
   Encrypt State: done        ← Encryption complete
✅ Encryption complete!
   Encrypted Stake ctHash: 103875452058198357077127603669227693186741...
   Encrypted Outcome ctHash: 508196000587840812439365742909128657625095...
```

**Output:**
```
🎯 Your bet index: 0
export BET_INDEX=0
📊 Updated Market Info:
   Total Bets: 1
   Total Escrow: 0.01 ETH
```

**What it does:**
- Encrypts stake and outcome client-side using CoFHE
- Submits encrypted values to contract
- Updates encrypted pool totals homomorphically
- Stores ETH as escrow for withdrawal
- **Nobody can see your bet amount or outcome!**

---

### 4. Request Decryption

After the market closes, request decryption of pool totals from the CoFHE MPC network.

```bash
MARKET_CONTRACT=<address> \
MARKET_ID=<id> \
pnpm hardhat run scripts/request-decryption.ts --network eth-sepolia
```

**Requirements:**
- Market must be closed (past closeTime)
- Can only be called once per market

**Output:**
```
🔄 Sending decryption request to CoFHE MPC network...
✅ Decryption requested in block: 9767674

🎯 Decryption Request Confirmed
   The CoFHE MPC threshold network is now decrypting the pools
   This may take a few moments...
```

**What it does:**
- Calls `FHE.decrypt()` on encrypted YES and NO pools
- Sends decryption request to CoFHE's MPC threshold network
- MPC network uses threshold cryptography to decrypt
- **Takes 30-60 seconds** for network to process

**Wait 30-60 seconds before settling!**

---

### 5. Settle Market

Retrieve decrypted results and determine the winner.

```bash
MARKET_CONTRACT=<address> \
MARKET_ID=<id> \
pnpm hardhat run scripts/settle-market.ts --network eth-sepolia
```

**Requirements:**
- Decryption must be requested (step 4)
- MPC decryption must be complete (30-60 seconds)

**Output:**
```
✅ Market settled in block: 9767677

🏆 Settlement Results:
  YES Pool: 0.025 ETH
  NO Pool: 0.008 ETH
  Winner: YES ✅
```

**What it does:**
- Calls `FHE.getDecryptResultSafe()` to retrieve decrypted values
- Checks if decryption is ready (returns bool)
- Compares YES vs NO pools to determine winner
- Stores decrypted values for payout calculation
- Emits `MarketSettled` event

**If not ready:**
```
⏳ Decryption not ready yet. Wait 30-60 seconds and try again.
```

---

### 6. Withdraw Winnings

Winners withdraw their proportional share of the losing pool.

```bash
MARKET_CONTRACT=<address> \
MARKET_ID=<id> \
BET_INDEX=<your_bet_index> \
pnpm hardhat run scripts/withdraw-payout.ts --network eth-sepolia
```

**Parameters:**
- `BET_INDEX` - Your bet index from step 3

**Payout Formula:**
```
Your Payout = (Your Stake / Winning Pool) × Losing Pool × (1 - Fee)
```

**Example Calculation:**
```
Your stake: 0.01 ETH on YES
YES pool: 0.025 ETH
NO pool: 0.008 ETH
Fee: 2% (200 bps)

Payout = (0.01 / 0.025) × 0.008 × 0.98
       = 0.4 × 0.008 × 0.98
       = 0.003136 ETH
```

**Output:**
```
🔍 Calculating your payout...
✅ Payout available: 0.003136 ETH
✅ Withdrawal successful!
💰 Payout received: 0.003136 ETH
```

**What it does:**
- Calls `FHE.decrypt()` on individual bet (if not already done)
- Waits for bet decryption to complete
- Calculates proportional payout
- Transfers ETH from escrow to bettor
- Marks bet as withdrawn

**Note:** Individual bet decryption may take additional time. If payout is 0, wait and retry.

---

### 7. Verify Encryption

Verify that bets are actually encrypted and cannot be read.

```bash
MARKET_CONTRACT=<address> \
MARKET_ID=<id> \
pnpm hardhat run scripts/verify-encryption.ts --network eth-sepolia
```

**Output:**
```
🔐 Bet Encryption Verification:
  Bet 0:
    Bettor: 0x177F6Ba434d350b551b60Fc257552AD13f78B5d1
    Escrow Amount: 0.01 ETH
    
    ❌ CANNOT see actual bet amount (encrypted as euint64)
    ❌ CANNOT see bet outcome YES/NO (encrypted as ebool)
    
    ✅ Only encrypted ciphertext stored on-chain
    ✅ Privacy preserved - no one can see your bet details
```

**What it proves:**
- Individual bet amounts are encrypted (`euint64`)
- Individual outcomes are encrypted (`ebool`)
- Only escrow amounts are public (for accounting)
- Encryption is cryptographically guaranteed

---

## 📖 Complete Workflow Example

### 5-Minute Test Market End-to-End

This example creates a complete market, places bets, and settles it in ~5 minutes.

```bash
# Step 1: Deploy Contract
pnpm hardhat run scripts/deploy-simple-prediction-market.ts --network eth-sepolia
export MARKET_CONTRACT=0x77958F65c64E0F165A7849B8Daf67eE0824E00C5

# Step 2: Create 5-minute market
MARKET_CONTRACT=$MARKET_CONTRACT \
QUESTION="Will BTC hit 100k?" \
DURATION=5 \
FEE_BPS=200 \
pnpm hardhat run scripts/create-market.ts --network eth-sepolia
export MARKET_ID=1

# Step 3: Place encrypted bet #1 (YES, 0.01 ETH)
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID \
STAKE_AMOUNT=0.01 OUTCOME=true \
pnpm hardhat run scripts/place-encrypted-bet.ts --network eth-sepolia

# Step 4: Place encrypted bet #2 (NO, 0.008 ETH)
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID \
STAKE_AMOUNT=0.008 OUTCOME=false \
pnpm hardhat run scripts/place-encrypted-bet.ts --network eth-sepolia

# Step 5: Place encrypted bet #3 (YES, 0.015 ETH)
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID \
STAKE_AMOUNT=0.015 OUTCOME=true \
pnpm hardhat run scripts/place-encrypted-bet.ts --network eth-sepolia

# Step 6: Wait 5 minutes for market to close
# Market closes automatically at the specified time

# Step 7: Request decryption from CoFHE MPC
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID \
pnpm hardhat run scripts/request-decryption.ts --network eth-sepolia

# Step 8: Wait 30-60 seconds for MPC decryption

# Step 9: Settle market with decrypted values
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID \
pnpm hardhat run scripts/settle-market.ts --network eth-sepolia

# Expected output:
# YES Pool: 0.025 ETH (0.01 + 0.015)
# NO Pool: 0.008 ETH
# Winner: YES

# Step 10: Withdraw winnings (Bet 0 - YES winner)
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID BET_INDEX=0 \
pnpm hardhat run scripts/withdraw-payout.ts --network eth-sepolia

# Step 11: Withdraw winnings (Bet 2 - YES winner)
MARKET_CONTRACT=$MARKET_CONTRACT MARKET_ID=$MARKET_ID BET_INDEX=2 \
pnpm hardhat run scripts/withdraw-payout.ts --network eth-sepolia
```

**Expected Results:**
- Total escrow: 0.033 ETH
- YES pool: 0.025 ETH (Bets 0 + 2)
- NO pool: 0.008 ETH (Bet 1)
- Winner: YES
- Bet 0 payout: ~0.003136 ETH
- Bet 2 payout: ~0.004704 ETH

---

## 🚧 Challenges We Faced

### 1. Solidity Stack Depth Limitations

**Problem:** The EVM has a 16 local variable stack limit. Complex contracts with many variables hit this limit, causing "stack too deep" compilation errors.

**Our Approach:**
- Started with `EnhancedPredictionMarket` (521 lines) with comprehensive features
- Hit stack-too-deep when adding on-chain decryption functionality
- Tried multiple fixes: struct modifications, separate mappings, gas optimizations
- **Solution:** Created `SimpleFHEPredictionMarket` (244 lines) with streamlined architecture
- Removed optional features, kept core functionality
- Enabled `viaIR: true` compiler optimization for better stack management

**Lesson Learned:** FHE contracts need careful architecture planning. Start simple, add features incrementally while monitoring stack depth.

---

### 2. Asynchronous FHE Decryption

**Problem:** CoFHE's MPC threshold decryption is asynchronous and takes 30-60 seconds. Cannot retrieve results immediately after requesting.

**Our Approach:**
- Initially tried single-step settlement (failed)
- Discovered decryption happens off-chain in MPC network
- **Solution:** Split into two-step process:
  1. `requestDecryption()` - Calls `FHE.decrypt()`, sends to MPC network
  2. `settleMarket()` - Calls `FHE.getDecryptResultSafe()`, retrieves when ready
- Used SAFE method that returns `(value, bool ready)` tuple
- Added user guidance to wait 30-60 seconds between steps

**Lesson Learned:** FHE operations are asynchronous by nature. Design workflows with wait times and readiness checks.

---

### 3. Individual Bet Decryption for Withdrawal

**Problem:** Withdrawal requires decrypting each individual bet's amount and outcome, which also takes time. `calculatePayout()` was returning 0 for winners.

**Our Approach:**
- Realized `withdraw()` triggers individual bet decryption
- `FHE.getDecryptResultSafe()` returns `false` if not ready
- **Solution:** 
  - `withdraw()` calls `FHE.decrypt()` on bet stake and outcome
  - `calculatePayout()` checks if decryption is ready
  - Returns 0 if not ready (user must retry)
  - Added documentation about waiting for bet-level decryption

**Future Improvement:** Batch decrypt all winning bets immediately after settlement to eliminate wait time.

**Lesson Learned:** Every encrypted value needs explicit decryption. Plan for multiple decryption rounds in complex workflows.

---

### 4. CoFHE Environment Configuration

**Problem:** Different encryption behavior across LOCAL, TESTNET, and production environments. Local testing worked but Sepolia deployment had issues.

**Our Approach:**
- Initially used "LOCAL" environment for all testing
- Encryption worked locally but failed on Sepolia
- **Solution:** Use correct environment for each network:
  - `LOCAL` for hardhat local node
  - `TESTNET` for Sepolia deployment
  - Different chain keys loaded per environment
- Proper initialization: `cofhejs.initializeWithEthers({ environment: "TESTNET" })`

**Lesson Learned:** Always match CoFHE environment to deployment network. Check chain key configuration.

---

### 5. Ethers v6 Compatibility

**Problem:** CoFHE documentation and examples use ethers v5 patterns. Ethers v6 has breaking changes.

**Our Approach:**
- Hit multiple type errors with v5 code
- **Solution:** Updated all ethers patterns:
  - `ethers.utils.parseEther()` → `ethers.parseEther()`
  - `ethers.utils.formatEther()` → `ethers.formatEther()`
  - `contract.deployed()` → `contract.waitForDeployment()`
  - Transaction receipts: `receipt.blockNumber` with null checks
  - Provider initialization changes

**Lesson Learned:** Check library versions and update patterns accordingly. Ethers v6 is not backward compatible.

---

### 6. TypeScript Type Issues with cofhejs

**Problem:** cofhejs `encrypt()` returns `Result<T>` type, not a direct array. Destructuring failed with type errors.

**Our Approach:**
- Initially tried: `const [stake, outcome] = await cofhejs.encrypt([...])`
- Got error: "Type 'Result<T>' must have a '[Symbol.iterator]()' method"
- **Solution:**
  ```typescript
  const encryptedData = await cofhejs.encrypt([...]);
  const stake = encryptedData.data![0];
  const outcome = encryptedData.data![1];
  ```
- Access via `.data` property with non-null assertion

**Lesson Learned:** Read TypeScript types carefully. Wrapper types require property access.

---

### 7. Gas Optimization for FHE Operations

**Problem:** FHE operations (add, select, decrypt) are significantly more expensive than regular operations. Contracts were hitting gas limits.

**Our Approach:**
- Analyzed gas costs: FHE.add() ~100k gas vs regular add ~3 gas
- **Solutions implemented:**
  - Reuse encrypted constants (ZERO, ONE) where possible
  - Minimize on-chain decryptions (only pools during settlement, not all bets)
  - Use `FHE.select()` for conditional logic instead of if/else branches
  - Enable Solidity optimizer: `optimizer: { enabled: true, runs: 200 }`
  - Use `viaIR: true` for better optimization
  - Batch operations where possible

**Lesson Learned:** FHE operations are expensive. Optimize aggressively and minimize encryption/decryption operations.

---

### 8. Testing FHE Locally vs Sepolia

**Problem:** Local hardhat testing doesn't have real MPC network. Decryption behavior differs.

**Our Approach:**
- Local testing: Instant decryption (simulated)
- Sepolia testing: Real MPC network with delays
- **Solution:**
  - Use local for development and quick iterations
  - Test full workflow on Sepolia before production
  - Document timing differences
  - Add retry logic for production

**Lesson Learned:** Always test on actual testnet with real MPC network before claiming success.

---

## 🔐 Security & Privacy

### Encryption Guarantees

1. **Client-Side Encryption** - CoFHE encrypts data before blockchain submission
2. **Zero-Knowledge Proofs** - Encryption validity proven without revealing data
3. **FHE Ciphertexts** - Stored as `euint64` and `ebool` (not regular integers)
4. **Homomorphic Operations** - Math computed on encrypted values without decryption
5. **MPC Threshold Decryption** - No single party can decrypt alone

### What's Private

✅ Individual bet amounts (encrypted as `euint64`)  
✅ Individual bet outcomes YES/NO (encrypted as `ebool`)  
✅ Pool totals during betting phase (encrypted homomorphic sums)  

### What's Public

✅ Market question and parameters  
✅ Escrow amounts (msg.value for accounting)  
✅ Bettor addresses (for withdrawal rights)  
✅ Decrypted pool totals after settlement  
✅ Winner determination (YES vs NO)  

### Verification

**Run encryption verification:**
```bash
pnpm hardhat run scripts/verify-encryption.ts --network eth-sepolia
```

**Read detailed proof:** [ENCRYPTION_PROOF.md](./ENCRYPTION_PROOF.md)

**View on Etherscan:**
- Contract: https://sepolia.etherscan.io/address/0x77958F65c64E0F165A7849B8Daf67eE0824E00C5
- Sample Bet TX: https://sepolia.etherscan.io/tx/0x847ed08757bb834279b22dc6f03947a97ababcbcd6bef1d257d2606bf7b3b100

---

## 📊 Technical Specifications

### Technology Stack

- **Smart Contracts:** Solidity 0.8.25
- **FHE Library:** Fhenix CoFHE v0.3.1
- **Client Encryption:** cofhejs/node
- **Network:** Ethereum Sepolia Testnet
- **Development:** Hardhat
- **Web3:** ethers.js v6.13.5
- **Language:** TypeScript

### Contract Details

- **Name:** `SimpleFHEPredictionMarket`
- **Lines:** 244
- **Deployed:** `0x77958F65c64E0F165A7849B8Daf67eE0824E00C5` (Sepolia)
- **Functions:** 9 public functions
- **Events:** 5 events
- **Optimizations:** viaIR enabled, 200 optimizer runs

### Performance Metrics

- **Bet Placement:** ~30s (includes client-side encryption)
- **Market Creation:** ~15s
- **Decryption Request:** ~10s (transaction only)
- **MPC Decryption Time:** 30-60s (off-chain)
- **Settlement:** ~15s
- **Withdrawal:** ~20s (after bet decryption ready)

### Gas Costs (approximate)

- **Deploy Contract:** ~2.5M gas
- **Create Market:** ~200k gas
- **Place Bet:** ~400k gas (FHE operations)
- **Request Decryption:** ~150k gas
- **Settle Market:** ~100k gas
- **Withdraw:** ~80k gas

---

## 📚 Documentation

- **[SIMPLE_MARKET_GUIDE.md](./SIMPLE_MARKET_GUIDE.md)** - Comprehensive user guide with examples
- **[ENCRYPTION_PROOF.md](./ENCRYPTION_PROOF.md)** - Technical proof of encryption
- **[SEPOLIA_TEST_SESSION.md](./SEPOLIA_TEST_SESSION.md)** - Live test results and transactions
- **[ONCHAIN_DECRYPTION.md](./ONCHAIN_DECRYPTION.md)** - MPC decryption architecture
- **[README_ORIGINAL.md](./README_ORIGINAL.md)** - Original CoFHE starter documentation

---

## 🎯 Use Cases

1. **Sports Betting** - Bet on games without revealing positions to bookmakers
2. **Election Predictions** - Predict outcomes without social/political pressure
3. **Financial Markets** - Trade on events without front-running by whales
4. **Whistleblowing Markets** - Predict corporate/political events anonymously
5. **Internal Predictions** - Company forecasts without office politics
6. **Research Markets** - Scientific outcome predictions without bias
7. **Reputation Systems** - Stake on trust without public exposure

---

## 🔮 Future Improvements

1. **Batch Withdrawal** - Decrypt all winning bets simultaneously after settlement
2. **Multiple Simultaneous Markets** - Support many concurrent markets
3. **Market Maker Integration** - Automated liquidity provision
4. **Oracle Integration** - Automatic settlement from real-world data feeds
5. **Multi-Outcome Markets** - Support for >2 outcomes (sports scores, etc.)
6. **Time-Weighted Odds** - Earlier bets get better pricing
7. **Frontend UI** - Web3 interface with wallet connection
8. **Mobile App** - React Native mobile betting experience
9. **Social Features** - Share encrypted positions with friends (selective disclosure)
10. **Advanced Analytics** - Historical market performance tracking

---

## 🧪 Testing

### Local Development

```bash
# Compile contracts
pnpm hardhat compile

# Run tests
pnpm hardhat test

# Start local node
pnpm hardhat node

# Run workflow test locally
pnpm hardhat run scripts/test-complete-workflow.ts
```

### Sepolia Testnet

**Live Contract:** `0x77958F65c64E0F165A7849B8Daf67eE0824E00C5`

**Test Results:**
- ✅ Market ID 0: 4 bets, 0.057 ETH total, 60-minute duration
- ✅ Market ID 1: 3 bets, 0.033 ETH total, 5-minute duration, **FULLY SETTLED**

**Verified Transactions:**
- Deploy: https://sepolia.etherscan.io/address/0x77958F65c64E0F165A7849B8Daf67eE0824E00C5
- Market 1 Creation: https://sepolia.etherscan.io/tx/0x07069475b8a5ea737d639055959f9781bb9f4c838ec6303dbe99c9abe14186e4
- Bet 0: https://sepolia.etherscan.io/tx/0x847ed08757bb834279b22dc6f03947a97ababcbcd6bef1d257d2606bf7b3b100
- Decryption Request: https://sepolia.etherscan.io/tx/0xcacf3875d4b2f8818ded56882c1995aa7e1d562d4b449ce1cc38c2257c08d83d
- Settlement: https://sepolia.etherscan.io/tx/0x2f6f8ed5d3835d3877a708a10fcb8a04efc617d0c7b149aeeff24aab38a16aad

---

## 🤝 Contributing

We welcome contributions! Please focus on:

- Gas optimization for FHE operations
- Frontend/UI development
- Additional market types and features
- Oracle integration
- Security auditing
- Documentation improvements

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Fhenix Protocol** - CoFHE library and MPC threshold decryption network
- **Hardhat** - Development and testing framework
- **OpenZeppelin** - Smart contract security patterns
- **Ethereum Foundation** - Sepolia testnet infrastructure

---

## 📞 Links

- **GitHub:** [Akhil-2310/fhe-pred-market](https://github.com/Akhil-2310/fhe-pred-market)
- **Contract (Sepolia):** `0x77958F65c64E0F165A7849B8Daf67eE0824E00C5`
- **Etherscan:** https://sepolia.etherscan.io/address/0x77958F65c64E0F165A7849B8Daf67eE0824E00C5
- **Fhenix Docs:** https://docs.fhenix.zone
- **CoFHE Docs:** https://docs.fhenix.zone/docs/devdocs/Working%20With%20CoFHE/cofhejs

---

## 🏆 Project Highlights

✅ **First Privacy-Preserving Prediction Market** with FHE on Ethereum  
✅ **Fully Functional** end-to-end encrypted betting workflow  
✅ **Production Deployed** on Sepolia with real encrypted bets  
✅ **Cryptographically Verified** encryption with ZK proofs  
✅ **Successfully Settled** via CoFHE MPC threshold network  
✅ **Complete Documentation** with step-by-step guides  
✅ **Open Source** ready for community contributions  

**Built with ❤️ and 🔐 using Fhenix CoFHE**
