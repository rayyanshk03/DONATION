import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const tokenAddress = "0x27DC1C167AeF232bb1e21073304B526726a8727e";
  const userAddress = "0xdbFabc3E543C4d451174273ba9A7e1E90Bb0C654";
  
  const abi = [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)"
  ];
  
  try {
    const token = new ethers.Contract(tokenAddress, abi, provider);
    const decimals = await token.decimals();
    const balance = await token.balanceOf(userAddress);
    console.log(`User Address: ${userAddress}`);
    console.log(`Balance Raw:  ${balance.toString()}`);
    console.log(`Balance Formatted: ${ethers.formatUnits(balance, decimals)} MUSD`);
  } catch (error) {
    console.error("Error reading balance:", error);
  }
}

main();
