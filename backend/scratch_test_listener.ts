import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const rpcUrl = "https://sepolia.base.org";
const vaultAddress = "0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c";

const VAULT_ABI = [
  "event DonationMade(address indexed donor, uint256 indexed causeId, uint256 amount, uint256 timestamp)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(vaultAddress, VAULT_ABI, provider);

  console.log("Registering one-time listener...");
  
  // Let's print out what arguments we get in contract.on
  contract.on("DonationMade", (donor, causeId, amount, timestamp, event) => {
    console.log("=== Event Received ===");
    console.log("donor:", donor);
    console.log("causeId:", causeId);
    console.log("amount:", amount);
    console.log("timestamp:", timestamp);
    console.log("event:", event);
    if (event) {
      console.log("event.transactionHash:", event.transactionHash);
      console.log("event.log:", event.log);
      if (event.log) {
        console.log("event.log.transactionHash:", event.log.transactionHash);
      }
    }
    process.exit(0);
  });

  // Let's keep it running for a bit
  console.log("Waiting for events (or press Ctrl+C)...");
  await new Promise(r => setTimeout(r, 10000));
  console.log("Timeout.");
  process.exit(0);
}

main().catch(console.error);
