// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UGCToken is ERC20, Ownable {
    constructor() ERC20("Universal Giving Coin", "UGC") Ownable(msg.sender) {
        // Mint 1,000,000 tokens to the deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Allow anyone to mint for testing purposes on Sepolia (Optional, but good for testing)
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
