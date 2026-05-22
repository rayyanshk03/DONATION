import { ethers } from "ethers";
import { env } from "../config/env.js";

// Configured statically for Base Sepolia (84532) to avoid startup network detection checks
export const provider = new ethers.JsonRpcProvider(
  env.rpcUrl,
  84532,
  { staticNetwork: ethers.Network.from(84532) }
);

export const signer = new ethers.Wallet(env.privateKey, provider);

const VAULT_ABI = [
  "function addCause(address _wallet, string calldata _name) external",
  "function causeCount() view returns (uint256)",
  "event CauseCreated(uint256 indexed causeId, address indexed wallet, string name)"
];

export const vaultContract = new ethers.Contract(env.vaultAddress, VAULT_ABI, signer);

export const tokenContract = new ethers.Contract(
  env.ugcTokenAddress,
  ["function faucet(address to, uint256 amount)"],
  signer
);
