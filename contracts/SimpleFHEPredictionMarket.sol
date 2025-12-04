// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title SimpleFHEPredictionMarket - Privacy-preserving prediction market with on-chain decryption
/// @notice Simplified prediction market using CoFHE's built-in on-chain decryption
contract SimpleFHEPredictionMarket {
    address public owner;
    uint256 public marketCounter;

    struct Market {
        address creator;
        string question;
        uint256 closeTime;
        uint16 feeBps;
        bool decryptionRequested;
        bool settled;
        bool winningOutcome; // true = YES, false = NO
        
        euint64 totalYes;
        euint64 totalNo;
        
        uint64 decryptedYes;
        uint64 decryptedNo;
    }

    struct Bet {
        address bettor;
        euint64 encryptedStake;
        ebool encryptedOutcome; // true = YES, false = NO
        uint256 escrowAmount;
        bool withdrawn;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public bets;
    mapping(uint256 => uint256) public marketEscrow;

    event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime);
    event BetPlaced(uint256 indexed marketId, uint256 indexed betIndex, address indexed bettor, uint256 escrowAmount);
    event DecryptionRequested(uint256 indexed marketId);
    event MarketSettled(uint256 indexed marketId, bool winningOutcome, uint64 yesPool, uint64 noPool);
    event PayoutWithdrawn(uint256 indexed marketId, uint256 indexed betIndex, address indexed bettor, uint256 amount);

    constructor() {
        owner = msg.sender;
        marketCounter = 0;
    }

    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint16 feeBps
    ) external returns (uint256) {
        require(closeTime > block.timestamp, "Close time must be in future");
        require(feeBps <= 1000, "Fee too high"); // Max 10%

        uint256 marketId = marketCounter++;
        Market storage m = markets[marketId];
        m.creator = msg.sender;
        m.question = question;
        m.closeTime = closeTime;
        m.feeBps = feeBps;
        m.totalYes = FHE.asEuint64(0);
        m.totalNo = FHE.asEuint64(0);
        
        FHE.allowThis(m.totalYes);
        FHE.allowThis(m.totalNo);

        emit MarketCreated(marketId, question, closeTime);
        return marketId;
    }

    function placeBet(
        uint256 marketId,
        InEuint64 calldata encStake,
        InEbool calldata encOutcome
    ) external payable {
        Market storage m = markets[marketId];
        require(block.timestamp < m.closeTime, "Market closed");
        require(!m.decryptionRequested, "Decryption already requested");
        require(msg.value > 0, "Must send ETH");

        // Convert encrypted inputs
        euint64 stake = FHE.asEuint64(encStake);
        ebool outcome = FHE.asEbool(encOutcome);

        // Update encrypted totals homomorphically
        euint64 stakeIfYes = FHE.select(outcome, stake, FHE.asEuint64(0));
        euint64 stakeIfNo = FHE.select(outcome, FHE.asEuint64(0), stake);
        
        m.totalYes = FHE.add(m.totalYes, stakeIfYes);
        m.totalNo = FHE.add(m.totalNo, stakeIfNo);
        
        FHE.allowThis(m.totalYes);
        FHE.allowThis(m.totalNo);
        FHE.allowThis(stake);
        FHE.allowThis(outcome);

        // Store bet
        Bet memory newBet = Bet({
            bettor: msg.sender,
            encryptedStake: stake,
            encryptedOutcome: outcome,
            escrowAmount: msg.value,
            withdrawn: false
        });
        
        bets[marketId].push(newBet);
        marketEscrow[marketId] += msg.value;

        emit BetPlaced(marketId, bets[marketId].length - 1, msg.sender, msg.value);
    }

    /// @notice Step 1: Request on-chain decryption via CoFHE MPC network
    function requestDecryption(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(block.timestamp >= m.closeTime, "Market not closed");
        require(!m.decryptionRequested, "Already requested");

        // Request decryption via CoFHE's MPC threshold network
        FHE.decrypt(m.totalYes);
        FHE.decrypt(m.totalNo);
        
        m.decryptionRequested = true;
        emit DecryptionRequested(marketId);
    }

    /// @notice Step 2: Retrieve decrypted results and settle market
    function settleMarket(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.decryptionRequested, "Decryption not requested");
        require(!m.settled, "Already settled");

        // Retrieve decrypted results using SAFE method
        (uint64 yesPool, bool yesReady) = FHE.getDecryptResultSafe(m.totalYes);
        require(yesReady, "YES pool not decrypted yet");
        
        (uint64 noPool, bool noReady) = FHE.getDecryptResultSafe(m.totalNo);
        require(noReady, "NO pool not decrypted yet");

        // Store decrypted values
        m.decryptedYes = yesPool;
        m.decryptedNo = noPool;
        
        // Determine winner (higher pool wins)
        m.winningOutcome = yesPool > noPool;
        m.settled = true;

        emit MarketSettled(marketId, m.winningOutcome, yesPool, noPool);
    }

    /// @notice Calculate payout for a specific bet
    function calculatePayout(uint256 marketId, uint256 betIndex) public view returns (uint256) {
        Market storage m = markets[marketId];
        require(m.settled, "Market not settled");
        
        Bet storage bet = bets[marketId][betIndex];
        
        // Get decrypted bet details
        (uint64 stake, bool stakeReady) = FHE.getDecryptResultSafe(bet.encryptedStake);
        if (!stakeReady) return 0;
        
        (bool outcome, bool outcomeReady) = FHE.getDecryptResultSafe(bet.encryptedOutcome);
        if (!outcomeReady) return 0;
        
        // Check if this bet won
        if (outcome != m.winningOutcome) {
            return 0; // Loser gets nothing
        }
        
        // Calculate parimutuel payout
        uint64 winningPool = outcome ? m.decryptedYes : m.decryptedNo;
        uint64 losingPool = outcome ? m.decryptedNo : m.decryptedYes;
        
        if (winningPool == 0) return 0;
        
        // Payout = (stake / winningPool) * losingPool * (1 - fee)
        uint256 totalPrize = losingPool * (10000 - m.feeBps) / 10000;
        uint256 payout = (stake * totalPrize) / winningPool;
        
        return payout;
    }

    /// @notice Withdraw winnings (must request bet decryption first)
    function withdraw(uint256 marketId, uint256 betIndex) external {
        Market storage m = markets[marketId];
        require(m.settled, "Market not settled");
        
        Bet storage bet = bets[marketId][betIndex];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.withdrawn, "Already withdrawn");

        // Request decryption of this specific bet if not already done
        FHE.decrypt(bet.encryptedStake);
        FHE.decrypt(bet.encryptedOutcome);
        
        uint256 payout = calculatePayout(marketId, betIndex);
        require(payout > 0, "No payout available");
        require(marketEscrow[marketId] >= payout, "Insufficient escrow");

        bet.withdrawn = true;
        marketEscrow[marketId] -= payout;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit PayoutWithdrawn(marketId, betIndex, msg.sender, payout);
    }

    function getMarketInfo(uint256 marketId) external view returns (
        string memory question,
        uint256 closeTime,
        uint16 feeBps,
        bool settled,
        uint256 numBets,
        uint256 totalEscrow
    ) {
        Market storage m = markets[marketId];
        return (
            m.question,
            m.closeTime,
            m.feeBps,
            m.settled,
            bets[marketId].length,
            marketEscrow[marketId]
        );
    }

    function getDecryptedPools(uint256 marketId) external view returns (
        uint64 yesPool,
        uint64 noPool,
        bool winningOutcome
    ) {
        Market storage m = markets[marketId];
        require(m.settled, "Not settled");
        return (m.decryptedYes, m.decryptedNo, m.winningOutcome);
    }
}
