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

  console.log("Fetching past events...");
  const events = await contract.queryFilter("DonationMade", -1000); // last 1000 blocks
  console.log(`Found ${events.length} events.`);

  if (events.length > 0) {
    const firstEvent = events[0];
    console.log("First event keys:", Object.keys(firstEvent));
    console.log("First event interface/prototype:", Object.getPrototypeOf(firstEvent));
    console.log("First event transactionHash:", (firstEvent as any).transactionHash);
    console.log("First event log:", (firstEvent as any).log);
    if ((firstEvent as any).log) {
      console.log("First event log transactionHash:", (firstEvent as any).log.transactionHash);
    }
  }
}

main().catch(console.error);
