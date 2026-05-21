// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSD
 * @notice Test stablecoin for the CryptoAid hackathon.
 *         1 MockUSD = $1.00 (no oracle — purely for demo).
 *         Includes ERC-20 Permit (EIP-2612) for gasless approvals.
 *         Anyone can call faucet() on testnet to get 10,000 tokens.
 */
contract MockUSD is ERC20, ERC20Permit, Ownable {

    constructor()
        ERC20("Mock USD", "MUSD")
        ERC20Permit("Mock USD")
        Ownable(msg.sender)
    {
        // Mint 1,000,000 MUSD to deployer for initial liquidity
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Public testnet faucet — mint any amount to any address.
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
