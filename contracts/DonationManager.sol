// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract DonationManagerUGC is ERC2771Context, Ownable {

    IERC20 public immutable ugcToken;

    mapping(uint => address) public causeWallets;
    mapping(uint => uint)    public totalDonatedUGC;
    mapping(uint => uint)    public donorCount;

    event Donated(address indexed donor, uint indexed causeId, uint amount);
    event CauseAdded(uint indexed causeId, address indexed wallet);

    constructor(address _ugcToken, address _trustedForwarder)
        ERC2771Context(_trustedForwarder)
        Ownable(msg.sender)
    {
        ugcToken = IERC20(_ugcToken);
    }

    // Called by the relayer — _msgSender() returns the REAL user address
    function donateUGC(uint causeId, uint amount) external {
        address donor = _msgSender();            // ERC-2771: real user
        address dest  = causeWallets[causeId];
        require(dest != address(0), "Unknown cause");
        require(amount > 0, "Amount must be > 0");

        bool ok = ugcToken.transferFrom(donor, dest, amount);
        require(ok, "UGC transfer failed");

        totalDonatedUGC[causeId] += amount;
        donorCount[causeId] += 1;
        emit Donated(donor, causeId, amount);
    }

    function addCause(uint causeId, address wallet) external onlyOwner {
        require(wallet != address(0), "Zero address");
        causeWallets[causeId] = wallet;
        emit CauseAdded(causeId, wallet);
    }

    // Helper functions for getCauses in the frontend!
    // Since the frontend needs to retrieve the causes' details (like raised amounts), we implement getCauses.
    function getCauses(uint[] calldata causeIds)
        external
        view
        returns (
            address[] memory wallets,
            uint[] memory donated,
            uint[] memory numDonors
        )
    {
        uint len = causeIds.length;
        wallets = new address[](len);
        donated = new uint[](len);
        numDonors = new uint[](len);

        for (uint i = 0; i < len; ) {
            uint id = causeIds[i];
            wallets[i] = causeWallets[id];
            donated[i] = totalDonatedUGC[id];
            numDonors[i] = donorCount[id];
            unchecked { ++i; }
        }
    }
}
