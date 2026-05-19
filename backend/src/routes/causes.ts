import { Router } from "express";
import { prisma } from "../services/prisma.js";

const router = Router();

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

export default router;
