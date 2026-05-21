// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DonationVault
 * @notice Manages gasless donations in Mock USD for the CryptoAid platform.
 *
 *  Features:
 *   - Cause creation with destination wallets
 *   - SafeERC20 transfers with reentrancy protection
 *   - On-chain donation tracking (amount + donor count)
 *   - Batch cause query for efficient frontend reads
 *   - Event emission for indexing (DonationMade, CauseCreated)
 *
 *  UGF Integration:
 *   DonationVault is chain-agnostic — it accepts standard ERC-20
 *   transferFrom calls. The gasless UGF layer wraps these calls
 *   externally; the contract itself does NOT need ERC-2771 or
 *   meta-tx support. The user signs a permit, the frontend builds
 *   the calldata, and UGF submits + pays gas on Base Sepolia.
 */
contract DonationVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────
    IERC20 public donationToken;          // MockUSD address

    struct Cause {
        address wallet;         // destination wallet
        uint256 totalDonated;   // cumulative token-wei donated
        uint256 donorCount;     // unique donation count (not unique donors)
        bool    active;         // can receive donations
    }

    mapping(uint256 => Cause) public causes;
    uint256 public causeCount;

    // Global analytics
    uint256 public totalDonations;      // sum of all donations in token-wei
    uint256 public totalDonationCount;  // total number of donation txs

    // ─── Events ───────────────────────────────────────────────────────────────
    event CauseCreated(uint256 indexed causeId, address indexed wallet, string name);
    event DonationMade(
        address indexed donor,
        uint256 indexed causeId,
        uint256 amount,
        uint256 timestamp
    );
    event CauseStatusChanged(uint256 indexed causeId, bool active);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    function setDonationToken(address _donationToken) external onlyOwner {
        require(_donationToken != address(0), "Zero token address");
        require(address(donationToken) == address(0), "Token already set");
        donationToken = IERC20(_donationToken);
    }

    // ─── Cause Management (Owner only) ────────────────────────────────────────

    /**
     * @notice Register a new cause. Emits CauseCreated.
     * @param _wallet  Destination wallet that receives donations.
     * @param _name    Human-readable cause name (indexed off-chain).
     */
    function addCause(address _wallet, string calldata _name) external onlyOwner {
        require(_wallet != address(0), "Zero wallet");
        causeCount++;
        causes[causeCount] = Cause({
            wallet:       _wallet,
            totalDonated: 0,
            donorCount:   0,
            active:       true
        });
        emit CauseCreated(causeCount, _wallet, _name);
    }

    /**
     * @notice Toggle a cause active/inactive.
     */
    function setCauseActive(uint256 _causeId, bool _active) external onlyOwner {
        require(causes[_causeId].wallet != address(0), "Unknown cause");
        causes[_causeId].active = _active;
        emit CauseStatusChanged(_causeId, _active);
    }

    // ─── Donate ───────────────────────────────────────────────────────────────

    /**
     * @notice Donate Mock USD to a cause.
     *         The caller must have approved this contract via `approve()` or
     *         `permit()` before calling donate().
     * @param _causeId  Registered cause ID (1-indexed).
     * @param _amount   Amount in token-wei (18 decimals).
     */
    function donate(uint256 _causeId, uint256 _amount) external nonReentrant {
        Cause storage c = causes[_causeId];
        require(c.wallet != address(0), "Unknown cause");
        require(c.active, "Cause inactive");
        require(_amount > 0, "Amount must be > 0");

        require(address(donationToken) != address(0), "Token not set");
        // SafeERC20 — reverts on failure, handles non-standard returns
        donationToken.safeTransferFrom(msg.sender, c.wallet, _amount);

        c.totalDonated += _amount;
        c.donorCount   += 1;
        totalDonations     += _amount;
        totalDonationCount += 1;

        emit DonationMade(msg.sender, _causeId, _amount, block.timestamp);
    }

    /**
     * @notice Donate with an EIP-2612 permit signature in a single transaction.
     */
    function donateWithPermit(
        uint256 _causeId,
        uint256 _amount,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Cause storage c = causes[_causeId];
        require(c.wallet != address(0), "Unknown cause");
        require(c.active, "Cause inactive");
        require(_amount > 0, "Amount must be > 0");

        require(address(donationToken) != address(0), "Token not set");

        IERC20Permit(address(donationToken)).permit(
            msg.sender,
            address(this),
            _amount,
            _deadline,
            v,
            r,
            s
        );

        donationToken.safeTransferFrom(msg.sender, c.wallet, _amount);

        c.totalDonated += _amount;
        c.donorCount   += 1;
        totalDonations     += _amount;
        totalDonationCount += 1;

        emit DonationMade(msg.sender, _causeId, _amount, block.timestamp);
    }

    // ─── Read Helpers (Frontend) ──────────────────────────────────────────────

    /**
     * @notice Batch-read cause data for the frontend campaign grid.
     */
    function getCauses(uint256[] calldata _causeIds)
        external
        view
        returns (
            address[] memory wallets,
            uint256[] memory donated,
            uint256[] memory numDonors
        )
    {
        uint256 len = _causeIds.length;
        wallets   = new address[](len);
        donated   = new uint256[](len);
        numDonors = new uint256[](len);

        for (uint256 i = 0; i < len; ) {
            Cause storage c = causes[_causeIds[i]];
            wallets[i]   = c.wallet;
            donated[i]   = c.totalDonated;
            numDonors[i] = c.donorCount;
            unchecked { ++i; }
        }
    }

    /**
     * @notice Return global platform analytics in a single call.
     */
    function getAnalytics()
        external
        view
        returns (
            uint256 _totalDonations,
            uint256 _totalDonationCount,
            uint256 _causeCount
        )
    {
        return (totalDonations, totalDonationCount, causeCount);
    }
}
