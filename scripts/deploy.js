import fs from "fs";
import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("Please set PRIVATE_KEY in .env");
  
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://rpc2.sepolia.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy UGC Token
  console.log("Reading UGCToken artifact...");
  const ugcArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/UGCToken.sol/UGCToken.json", "utf8"));
  const UGCToken = new ethers.ContractFactory(ugcArtifact.abi, ugcArtifact.bytecode, deployer);
  const ugcToken = await UGCToken.deploy();
  await ugcToken.waitForDeployment();
  const ugcTokenAddress = await ugcToken.getAddress();
  console.log("UGCToken deployed to:", ugcTokenAddress);

  // 2. Deploy DonationManager
  const SEPOLIA_FORWARDER = "0xe4c33113074c4801111a0965d1d6a6669bc0915a";
  console.log("Reading DonationManager artifact...");
  const dmArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/DonationManager.sol/DonationManagerUGC.json", "utf8"));
  const DonationManager = new ethers.ContractFactory(dmArtifact.abi, dmArtifact.bytecode, deployer);
  const donationManager = await DonationManager.deploy(ugcTokenAddress, SEPOLIA_FORWARDER);
  await donationManager.waitForDeployment();
  const donationManagerAddress = await donationManager.getAddress();

  console.log("\n--- DEPLOYMENT COMPLETE ---");
  console.log("VITE_UGC_TOKEN_ADDRESS=" + ugcTokenAddress);
  console.log("VITE_DONATION_CONTRACT_ADDRESS=" + donationManagerAddress);
  console.log("---------------------------\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
