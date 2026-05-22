import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const userAddress = "0xdbFabc3E543C4d451174273ba9A7e1E90Bb0C654";
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error("Missing PRIVATE_KEY in .env");
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deployer address: ${wallet.address}`);
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`Deployer ETH balance: ${ethers.formatEther(ethBalance)} ETH`);

  // 1. Send Base Sepolia ETH to the user
  console.log(`\n1. Sending 0.05 ETH to ${userAddress}...`);
  try {
    const tx = await wallet.sendTransaction({
      to: userAddress,
      value: ethers.parseEther("0.05")
    });
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("ETH successfully sent!");
  } catch (err) {
    console.error("Failed to send ETH:", err);
  }

  // 2. Mint Mock USD to the user
  const mockUsdAddress = "0x27DC1C167AeF232bb1e21073304B526726a8727e";
  const mockUsdAbi = [
    "function faucet(address to, uint256 amount) external",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  console.log(`\n2. Querying Mock USD Decimals...`);
  try {
    const contract = new ethers.Contract(mockUsdAddress, mockUsdAbi, wallet);
    const decimals = await contract.decimals();
    console.log(`Decimals: ${decimals}`);

    const mintAmount = ethers.parseUnits("5000", decimals);
    console.log(`Minting 5,000 Mock USD to ${userAddress}...`);
    const tx = await contract.faucet(userAddress, mintAmount);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Mock USD successfully minted!");

    const userBal = await contract.balanceOf(userAddress);
    console.log(`User's new Mock USD balance: ${ethers.formatUnits(userBal, decimals)}`);
  } catch (err) {
    console.error("Failed to mint Mock USD:", err);
  }
}

main();
