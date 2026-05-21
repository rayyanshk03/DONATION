import { ethers } from "ethers";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../services/prisma.js";
import { redis } from "../services/redis.js";
import { broadcast } from "../websocket/server.js";

const VAULT_ABI = [
  "event DonationMade(address indexed donor, uint256 indexed causeId, uint256 amount, uint256 timestamp)",
  "function donationToken() view returns (address)",
];

let cachedDecimals: number | null = null;
let tokenAddress: string | null = null;

async function getDecimals(vaultContract: ethers.Contract, provider: any) {
  if (cachedDecimals !== null) return cachedDecimals;
  try {
    if (!tokenAddress) {
      tokenAddress = await vaultContract.donationToken();
    }
    if (tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000") {
      const tokenContract = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], provider);
      const dec = await tokenContract.decimals();
      cachedDecimals = Number(dec);
      console.log(`[Indexer] Detected token decimals dynamically: ${cachedDecimals}`);
      return cachedDecimals;
    }
  } catch (err: any) {
    console.warn("[Indexer] Failed to query token decimals dynamically, falling back to 18 decimals:", err.message || err);
  }
  return 18; // default fallback
}

function getProvider() {
  if (env.rpcWsUrl && env.rpcWsUrl.startsWith("ws")) {
    try {
      return new ethers.WebSocketProvider(env.rpcWsUrl);
    } catch (err) {
      console.warn("[RPC] WebSocket connection failed. Falling back to HTTP RPC.", err);
    }
  }
  return new ethers.JsonRpcProvider(env.rpcUrl);
}

export function startDonationListener() {
  const provider = getProvider();
  const contract = new ethers.Contract(env.vaultAddress, VAULT_ABI, provider);

  console.log("* Connected to Base Sepolia RPC");
  console.log("* Listening for DonationVault events");

  contract.on("DonationMade", async (donor, causeId, amount, timestamp, event) => {
    const decimals = await getDecimals(contract, provider);
    const amountFormatted = ethers.formatUnits(amount, decimals);
    const amountDecimal = new Prisma.Decimal(amountFormatted);
    const causeIdNum = Number(causeId);

    try {
      await prisma.donation.upsert({
        where: { txHash: event.transactionHash },
        update: { ugfStatus: "confirmed" },
        create: {
          donor,
          amount: amountDecimal,
          txHash: event.transactionHash,
          ugfStatus: "confirmed",
          causeId: causeIdNum,
          createdAt: new Date(Number(timestamp) * 1000),
        },
      });

      await prisma.donor.upsert({
        where: { wallet: donor },
        update: {
          totalDonated: { increment: amountDecimal },
          donationCount: { increment: 1 },
          lastDonation: new Date(),
        },
        create: {
          wallet: donor,
          totalDonated: amountDecimal,
          donationCount: 1,
          firstDonation: new Date(),
          lastDonation: new Date(),
        },
      });

      if (redis) {
        await redis.del("leaderboard:all");
      }

      const [cause, totalAgg, donorRows] = await Promise.all([
        prisma.cause.findUnique({ where: { id: causeIdNum } }),
        prisma.donation.aggregate({
          where: { causeId: causeIdNum },
          _sum: { amount: true },
        }),
        prisma.donation.findMany({
          where: { causeId: causeIdNum },
          distinct: ["donor"],
          select: { donor: true },
        }),
      ]);

      broadcast({
        type: "new_donation",
        donor,
        causeId: causeIdNum,
        causeName: cause?.name ?? "Unknown",
        amount: amountFormatted,
        txHash: event.transactionHash,
        timestamp: new Date().toISOString(),
      });

      broadcast({
        type: "cause_update",
        causeId: causeIdNum,
        totalDonated: totalAgg._sum.amount?.toString() ?? "0",
        donorCount: donorRows.length,
      });

      broadcast({ type: "leaderboard_invalidate" });
    } catch (err) {
      console.error("[Indexer] DonationMade handler failed:", err);
    }
  });

  return contract;
}
