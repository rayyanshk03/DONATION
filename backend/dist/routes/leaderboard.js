import { Router } from "express";
import { prisma } from "../services/prisma.js";
import { getCache, setCache } from "../services/redis.js";
const router = Router();
const CACHE_KEY = "leaderboard:all";
const CACHE_TTL = 60;
router.get("/leaderboard", async (_req, res) => {
    try {
        const cached = await getCache(CACHE_KEY);
        if (cached) {
            return res.json(cached);
        }
        const donors = await prisma.donor.findMany({
            orderBy: { totalDonated: "desc" },
            take: 10,
        });
        const payload = {
            leaderboard: donors.map((donor) => ({
                wallet: donor.wallet,
                totalDonated: donor.totalDonated.toString(),
                donationCount: donor.donationCount,
            })),
        };
        await setCache(CACHE_KEY, payload, CACHE_TTL);
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({
            error: "Failed to load leaderboard",
            message: err instanceof Error ? err.message : "Unknown error",
        });
    }
});
export default router;
