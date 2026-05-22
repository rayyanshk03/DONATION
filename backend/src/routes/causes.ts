import { Router } from "express";
import { prisma } from "../services/prisma.js";
import { Prisma } from "@prisma/client";
import { ethers } from "ethers";
import { env } from "../config/env.js";
import { vaultContract } from "../services/ethers.js";


const router = Router();

const VAULT_ABI = [
  "function addCause(address _wallet, string calldata _name) external",
  "function causeCount() view returns (uint256)",
  "event CauseCreated(uint256 indexed causeId, address indexed wallet, string name)"
];

router.get("/causes", async (_req, res) => {
  try {
    const causes = await prisma.cause.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    });

    const totals = await prisma.donation.groupBy({
      by: ["causeId"],
      _sum: { amount: true },
    });

    const donorRows = await prisma.donation.findMany({
      select: { causeId: true, donor: true },
      distinct: ["causeId", "donor"],
    });

    const totalMap = new Map<number, string>();
    totals.forEach((t) => {
      totalMap.set(t.causeId, t._sum.amount?.toString() ?? "0");
    });

    const donorCountMap = new Map<number, number>();
    donorRows.forEach((row) => {
      donorCountMap.set(row.causeId, (donorCountMap.get(row.causeId) ?? 0) + 1);
    });

    res.json({
      causes: causes.map((cause) => ({
        id: cause.id,
        name: cause.name,
        description: cause.description,
        wallet: cause.wallet,
        icon: cause.icon,
        tag: cause.tag,
        goalUsd: cause.goalUsd.toString(),
        active: cause.active,
        totalDonated: totalMap.get(cause.id) ?? "0",
        donorCount: donorCountMap.get(cause.id) ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load causes",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// GET /api/causes/:id/donations
router.get("/causes/:id/donations", async (req, res) => {
  const causeId = parseInt(req.params.id);
  if (isNaN(causeId)) {
    return res.status(400).json({ error: "Invalid cause ID" });
  }

  try {
    const donations = await prisma.donation.findMany({
      where: { causeId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      donations: donations.map((d) => ({
        id: d.id,
        donor: d.donor,
        amount: d.amount.toString(),
        txHash: d.txHash,
        timestamp: d.createdAt.toISOString(),
        ugfStatus: d.ugfStatus,
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load donations for cause",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// POST /api/causes
router.post("/causes", async (req, res) => {
  const { name, description, wallet, icon, tag, goalUsd } = req.body;

  // Validation
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a string" });
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    return res.status(400).json({ error: "Description is required and must be a string" });
  }
  if (!wallet || typeof wallet !== "string" || !ethers.isAddress(wallet)) {
    return res.status(400).json({ error: "A valid recipient wallet address is required" });
  }
  if (!icon || typeof icon !== "string") {
    return res.status(400).json({ error: "Icon is required" });
  }
  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ error: "Tag (category) is required" });
  }
  if (goalUsd === undefined || isNaN(Number(goalUsd)) || Number(goalUsd) <= 0) {
    return res.status(400).json({ error: "Goal in USD must be a positive number" });
  }

  try {
    console.log(`[Campaign Registration] Submitting cause "${name}" on-chain to address: ${wallet}`);

    // Use the shared pre-initialized vaultContract instance
    const contract = vaultContract;

    // Call addCause on smart contract
    const tx = await contract.addCause(wallet, name);
    console.log(`[Campaign Registration] Transaction submitted: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait();

    // Parse logs to find CauseCreated event and retrieve the causeId
    let causeId: number | null = null;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "CauseCreated") {
            causeId = Number(parsed.args.causeId);
            console.log(`[Campaign Registration] On-chain CauseCreated event found! causeId = ${causeId}`);
            break;
          }
        } catch (e) {
          // Log parsing failed for this particular log (unrelated events), skip
        }
      }
    }

    if (causeId === null) {
      throw new Error("Failed to retrieve causeId from on-chain transaction receipt.");
    }

    console.log(`[Campaign Registration] Writing cause record to database for cause ID ${causeId}...`);
    const cause = await prisma.cause.create({
      data: {
        id: causeId,
        name: name.trim(),
        description: description.trim(),
        wallet: wallet.toLowerCase(),
        icon,
        tag,
        goalUsd: new Prisma.Decimal(goalUsd.toString()),
        active: true,
      },
    });

    console.log(`[Campaign Registration] Campaign registration successful! ID: ${cause.id}`);

    res.status(201).json({
      success: true,
      cause: {
        id: cause.id,
        name: cause.name,
        description: cause.description,
        wallet: cause.wallet,
        icon: cause.icon,
        tag: cause.tag,
        goalUsd: cause.goalUsd.toString(),
        active: cause.active,
        totalDonated: "0",
        donorCount: 0,
      },
    });
  } catch (err: any) {
    console.error("[Campaign Registration] Failed to register cause:", err);
    res.status(500).json({
      error: "Failed to register campaign",
      message: err.message || "Unknown error",
    });
  }
});

// DELETE /api/causes/:id (Soft-delete)
router.delete("/causes/:id", async (req, res) => {
  const causeId = parseInt(req.params.id);
  if (isNaN(causeId)) {
    return res.status(400).json({ error: "Invalid cause ID" });
  }

  try {
    const cause = await prisma.cause.update({
      where: { id: causeId },
      data: { active: false },
    });
    res.json({ success: true, message: "Campaign deleted successfully", cause });
  } catch (err) {
    res.status(500).json({
      error: "Failed to delete campaign",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;

