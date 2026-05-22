import { Router } from "express";
import { ethers } from "ethers";
import { env } from "../config/env.js";
import { tokenContract } from "../services/ethers.js";


const router = Router();

router.post("/faucet", async (req, res) => {
  const { address } = req.body;

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid target Ethereum address" });
  }

  try {
    const amount = ethers.parseUnits("10000", 18);
    const tx = await tokenContract.faucet(address, amount);
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      message: "10,000 Mock USD successfully sponsored and minted!"
    });
  } catch (err: any) {
    console.error("Sponsored faucet transaction failed:", err);
    res.status(500).json({ error: err.message || "Failed to execute faucet transaction" });
  }
});

export default router;
