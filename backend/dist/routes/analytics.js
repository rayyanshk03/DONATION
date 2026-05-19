import { Router } from "express";
import { prisma } from "../services/prisma.js";
import { toFixedString } from "../utils/format.js";
const router = Router();
router.get("/analytics/overview", async (_req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [agg, activeCauses, last24hAgg, uniqueDonors] = await Promise.all([
            prisma.donation.aggregate({
                _sum: { amount: true },
                _count: { _all: true },
                _avg: { amount: true },
            }),
            prisma.cause.count({ where: { active: true } }),
            prisma.donation.aggregate({
                _sum: { amount: true },
                where: { createdAt: { gte: last24h } },
            }),
            prisma.donor.count(),
        ]);
        res.json({
            totalDonated: toFixedString(agg._sum.amount),
            totalDonations: agg._count._all,
            uniqueDonors,
            avgDonation: toFixedString(agg._avg.amount),
            activeCauses,
            last24hVolume: toFixedString(last24hAgg._sum.amount),
        });
    }
    catch (err) {
        res.status(500).json({
            error: "Failed to load analytics",
            message: err instanceof Error ? err.message : "Unknown error",
        });
    }
});
export default router;
