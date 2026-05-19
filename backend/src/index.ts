import http from "http";
import express from "express";
import { env } from "./config/env.js";
import { initWebsocket } from "./websocket/server.js";
import { startDonationListener } from "./indexer/donationListener.js";
import { prisma } from "./services/prisma.js";
import { redis } from "./services/redis.js";
import causesRoutes from "./routes/causes.js";
import donationsRoutes from "./routes/donations.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import analyticsRoutes from "./routes/analytics.js";
import healthRoutes from "./routes/health.js";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const origin = env.corsOrigin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use("/api", causesRoutes);
app.use("/api", donationsRoutes);
app.use("/api", leaderboardRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", healthRoutes);

const server = http.createServer(app);
initWebsocket(server);

server.listen(env.port, async () => {
  console.log(`* Express server running on port ${env.port}`);

  // 1. Verify PostgreSQL Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("* Connected to PostgreSQL");
  } catch (err) {
    console.error("❌ Failed to connect to PostgreSQL:", err);
  }

  // 2. Verify Redis Connection
  if (redis) {
    try {
      await redis.ping();
      console.log("* Connected to Redis");
    } catch (err) {
      console.error("❌ Failed to connect to Redis (running in fallback mode):", err);
    }
  } else {
    console.log("* Redis not configured (optional)");
  }

  // 3. Start Ethereum Event Listener
  startDonationListener();
});
