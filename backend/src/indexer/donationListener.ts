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
  return new ethers.JsonRpcProvider(env.rpcUrl, 84532, { staticNetwork: ethers.Network.from(84532) });
}

/**
 * Handles the logic for indexing a donation and updating statistics in the database.
 */
async function processDonation(
  donor: string,
  causeId: bigint | number,
  amount: bigint | number | string,
  timestamp: bigint | number,
  txHash: string,
  vaultContract: ethers.Contract,
  provider: any,
  shouldBroadcast: boolean = true
) {
  try {
    const decimals = await getDecimals(vaultContract, provider);
    const amountFormatted = ethers.formatUnits(amount, decimals);
    const amountDecimal = new Prisma.Decimal(amountFormatted);
    const causeIdNum = Number(causeId);

    // Check if this tx has already been indexed as confirmed
    const existing = await prisma.donation.findUnique({
      where: { txHash }
    });

    if (existing && existing.ugfStatus === "confirmed") {
      // Already fully indexed
      return;
    }

    console.log(`[Indexer] Indexing donation: ${amountFormatted} USD from ${donor} for cause ${causeIdNum} (tx: ${txHash})`);

    await prisma.donation.upsert({
      where: { txHash },
      update: { ugfStatus: "confirmed" },
      create: {
        donor,
        amount: amountDecimal,
        txHash,
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

    if (shouldBroadcast) {
      broadcast({
        type: "new_donation",
        donor,
        causeId: causeIdNum,
        causeName: cause?.name ?? "Unknown",
        amount: amountFormatted,
        txHash,
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      });

      broadcast({
        type: "cause_update",
        causeId: causeIdNum,
        totalDonated: totalAgg._sum.amount?.toString() ?? "0",
        donorCount: donorRows.length,
      });

      broadcast({ type: "leaderboard_invalidate" });
    }
  } catch (err) {
    console.error(`[Indexer] Failed to process donation in DB (tx: ${txHash}):`, err);
  }
}

/**
 * Queries and indexes historical events from the last 1500 blocks.
 */
async function backfillPastEvents(contractAddress: string) {
  try {
    console.log("[Indexer] Starting background historical backfill (last 1500 blocks)...");
    const publicProvider = new ethers.JsonRpcProvider(
      "https://sepolia.base.org",
      84532,
      { staticNetwork: ethers.Network.from(84532) }
    );
    const publicContract = new ethers.Contract(contractAddress, VAULT_ABI, publicProvider);

    const events = await publicContract.queryFilter("DonationMade", -1500);
    console.log(`[Indexer] Found ${events.length} historical events in block range.`);

    for (const event of events) {
      const e = event as any;
      const donor = e.args[0] || e.args.donor;
      const causeId = e.args[1] || e.args.causeId;
      const amount = e.args[2] || e.args.amount;
      const timestamp = e.args[3] || e.args.timestamp;
      const txHash = e.transactionHash;

      if (donor && causeId !== undefined && amount !== undefined && timestamp !== undefined && txHash) {
        await processDonation(donor, causeId, amount, timestamp, txHash, publicContract, publicProvider, false);
      }
    }
    console.log("[Indexer] Background historical backfill completed successfully.");
  } catch (err: any) {
    console.warn("[Indexer] Startup backfill failed:", err.message || err);
  }
}

export function startDonationListener() {
  const provider = getProvider();
  const contract = new ethers.Contract(env.vaultAddress, VAULT_ABI, provider);

  console.log("* Connected to Base Sepolia RPC");
  console.log("* Listening for DonationVault events");

  contract.on("DonationMade", async (donor, causeId, amount, timestamp, event) => {
    // Robust extraction of transactionHash from callback arguments
    let txHash: string | undefined;
    if (event && typeof event === "object") {
      if (event.log && typeof event.log === "object" && typeof event.log.transactionHash === "string") {
        txHash = event.log.transactionHash;
      } else if (typeof event.transactionHash === "string") {
        txHash = event.transactionHash;
      }
    }
    if (!txHash) {
      // Fallback check on all parameters for transaction hash
      for (const arg of [event, donor, causeId, amount, timestamp]) {
        if (arg && typeof arg === "object") {
          if (typeof arg.transactionHash === "string") {
            txHash = arg.transactionHash;
            break;
          }
          if (arg.log && typeof arg.log === "object" && typeof arg.log.transactionHash === "string") {
            txHash = arg.log.transactionHash;
            break;
          }
        }
      }
    }

    if (!txHash) {
      console.error("[Indexer] DonationMade event received but transactionHash could not be resolved.");
      return;
    }

    await processDonation(donor, causeId, amount, timestamp, txHash, contract, provider, true);
  });

  // Start background backfill asynchronously
  setTimeout(() => {
    backfillPastEvents(env.vaultAddress).catch(err => {
      console.error("[Indexer] Error triggering backfill:", err);
    });
  }, 1000);

  return contract;
}
