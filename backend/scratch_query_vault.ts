import { ethers } from "ethers";
import { env } from "./src/config/env.js";

async function main() {
  const provider = new ethers.JsonRpcProvider(env.rpcUrl);
  const wallet = new ethers.Wallet(env.privateKey, provider);
  console.log("Configured Private Key Wallet Address:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet native balance (ETH):", ethers.formatEther(balance));

  // Connect to vault
  const vaultAbi = [
    "function owner() view returns (address)",
    "function donationToken() view returns (address)",
    "function causeCount() view returns (uint256)"
  ];
  const targetAddress = env.vaultAddress;
  console.log("Checking vault:", targetAddress);
  const vault = new ethers.Contract(targetAddress, vaultAbi, provider);

  try {
    const owner = await vault.owner();
    console.log("Vault Owner:", owner);
    const token = await vault.donationToken();
    console.log("Donation Token:", token);
    const count = await vault.causeCount();
    console.log("Cause Count:", count.toString());
  } catch (error) {
    console.error("Error querying vault:", error);
  }
}

main();
