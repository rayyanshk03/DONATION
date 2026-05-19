import { Router } from "express";
import { prisma } from "../services/prisma.js";
import { redis } from "../services/redis.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisStatus = redis ? await redis.ping() : "disabled";
    res.json({
      status: "ok",
      db: "ok",
      redis: redisStatus === "PONG" ? "ok" : "disabled",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Health check failed",
    });
  }
});

export default router;
