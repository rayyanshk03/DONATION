import { Router } from "express";
import { prisma } from "../services/prisma.js";
import { Prisma } from "@prisma/client";
import { redis } from "../services/redis.js";
import { broadcast } from "../websocket/server.js";

const router = Router();

router.get("/donations/feed", async (_req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { cause: { select: { name: true } } },
    });

    res.json({
      donations: donations.map((donation) => ({
        id: donation.id,
        donor: donation.donor,
        causeId: donation.causeId,
        causeName: donation.cause?.name ?? "Unknown",
        amount: donation.amount.toString(),
        txHash: donation.txHash,
        timestamp: donation.createdAt.toISOString(),
        ugfStatus: donation.ugfStatus,
      })),
      total: donations.length,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load donation feed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});



export default router;
