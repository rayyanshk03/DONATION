import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const tokenAddress = "0x27DC1C167AeF232bb1e21073304B526726a8727e";
  
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];
  
  try {
    const token = new ethers.Contract(tokenAddress, abi, provider);
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals()
    ]);
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Name:          ${name}`);
    console.log(`Symbol:        ${symbol}`);
    console.log(`Decimals:      ${decimals}`);
  } catch (error) {
    console.error("Error reading token details:", error);
  }
}

main();
