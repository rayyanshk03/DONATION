import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const tokens = [
    "0x27DC1C167AeF232bb1e21073304B526726a8727e",
    "0x1eDa37f016bDA3013de7A49e0fb4348c574C1BEf"
  ];
  
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];
  
  for (const tokenAddress of tokens) {
    try {
      const token = new ethers.Contract(tokenAddress, abi, provider);
      const [name, symbol, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals()
      ]);
      console.log(`\nToken Address: ${tokenAddress}`);
      console.log(`Name:          ${name}`);
      console.log(`Symbol:        ${symbol}`);
      console.log(`Decimals:      ${decimals}`);
    } catch (error) {
      console.error(`\nError reading token details for ${tokenAddress}:`, error.message);
    }
  }
}

main();
