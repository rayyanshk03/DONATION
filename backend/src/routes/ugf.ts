import { Router } from "express";
import { ethers } from "ethers";
import { env } from "../config/env.js";
import { prisma } from "../services/prisma.js";
import { provider as sharedProvider, signer as sharedSigner } from "../services/ethers.js";


const router = Router();

// ─── In-memory state stores ───────────────────────────────────────────────────
interface UGFQuote {
  quoteId: string;
  sender: string;
  calls: Array<{ target: string; calldata: string; value: string }>;
  gasCostUsd: string;
  expiresAt: number;
}

interface UGFSettlement {
  settlementId: string;
  quoteId: string;
}

interface UGFExecution {
  executionId: string;
  quoteId: string;
  txHash?: string;
  blockNumber?: number;
  status: "pending" | "confirmed" | "failed";
  error?: string;
}

const quotes     = new Map<string, UGFQuote>();
const settlements = new Map<string, UGFSettlement>();   // settlementId → quoteId
const executions  = new Map<string, UGFExecution>();

// ── Phase 1: QUOTE ───────────────────────────────────────────────────────────
router.post("/v1/quote", async (req, res) => {
  const { sender, chainId, calls } = req.body;

  if (!sender || !calls || !Array.isArray(calls) || calls.length === 0) {
    return res
      .status(400)
      .json({ error: { message: "sender and non-empty calls[] are required." } });
  }

  try {
    const provider = sharedProvider;
    const feeData  = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? ethers.parseUnits("5", "gwei");

    // Estimate gas per call type (permit ~50k, donate ~80k)
    const gasLimit    = BigInt(calls.length > 1 ? 180_000 : 90_000);
    const gasCostWei  = gasPrice * gasLimit;
    const gasCostEth  = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd  = Math.max(0.01, gasCostEth * 3000).toFixed(4);

    const quoteId   = "ugf_q_" + Math.random().toString(36).substring(2, 12);
    const expiresAt = Date.now() + 300_000; // 5 minutes

    quotes.set(quoteId, { quoteId, sender, calls, gasCostUsd, expiresAt });

    console.log(`[UGF] ① QUOTE ${quoteId} | sender=${sender} | gas≈$${gasCostUsd} Mock USD`);

    res.json({ quoteId, gasCostUsd, expiresAt, status: "active" });
  } catch (err: any) {
    console.error("[UGF] Quote phase error:", err);
    res.status(500).json({ error: { message: err.message || "Failed to generate quote" } });
  }
});

// ── Phase 2: SETTLE ──────────────────────────────────────────────────────────
router.post("/v1/settle", async (req, res) => {
  const { quoteId, signature } = req.body;

  if (!quoteId || !signature) {
    return res
      .status(400)
      .json({ error: { message: "quoteId and signature are required." } });
  }

  const quote = quotes.get(quoteId);
  if (!quote) {
    return res
      .status(404)
      .json({ error: { message: `Quote ${quoteId} not found or expired.` } });
  }

  try {
    // Reconstruct the exact message the frontend signed
    const authMessage =
      `CryptoAid UGF Authorization\n\nQuote: ${quoteId}\nChain: 84532\n` +
      `Gas: ${quote.gasCostUsd} Mock USD\n\nI authorize UGF to execute this gasless transaction.`;

    const recovered = ethers.verifyMessage(authMessage, signature);

    if (recovered.toLowerCase() !== quote.sender.toLowerCase()) {
      throw new Error(
        `Signature mismatch — recovered ${recovered}, expected ${quote.sender}`
      );
    }

    const settlementId = "ugf_s_" + Math.random().toString(36).substring(2, 12);

    // ✅ Store the link: settlementId → quoteId
    settlements.set(settlementId, { settlementId, quoteId });

    console.log(`[UGF] ② SETTLE ${settlementId} ← quote ${quoteId}`);

    res.json({ settlementId, status: "settled", quoteId });
  } catch (err: any) {
    console.error("[UGF] Settle phase error:", err);
    res.status(500).json({ error: { message: err.message || "Failed to settle quote" } });
  }
});

// ── Phase 3: EXECUTE ─────────────────────────────────────────────────────────
router.post("/v1/execute", async (req, res) => {
  const { settlementId } = req.body;

  if (!settlementId) {
    return res
      .status(400)
      .json({ error: { message: "settlementId is required." } });
  }

  // ✅ Correctly trace settlementId → quoteId → calls
  const settlement = settlements.get(settlementId);
  if (!settlement) {
    return res
      .status(404)
      .json({ error: { message: `Settlement ${settlementId} not found.` } });
  }

  const quote = quotes.get(settlement.quoteId);
  if (!quote) {
    return res
      .status(404)
      .json({ error: { message: `Quote for settlement not found.` } });
  }

  const executionId = "ugf_e_" + Math.random().toString(36).substring(2, 12);

  executions.set(executionId, {
    executionId,
    quoteId: settlement.quoteId,
    status: "pending",
  });

  // Respond immediately — background task does the actual execution
  res.json({ executionId, status: "submitted" });

  // ─── Background execution ────────────────────────────────────────────────
  (async () => {
    const exec = executions.get(executionId)!;
    try {
      const provider = sharedProvider;
      const wallet   = sharedSigner;

      console.log(
        `[UGF] ③ EXECUTE ${executionId} | ${quote.calls.length} call(s) on Base Sepolia`
      );

      let lastTx: ethers.TransactionResponse;

      if (quote.calls.length > 1) {
        // Multi-call: permit first, then donate
        for (let i = 0; i < quote.calls.length; i++) {
          const call = quote.calls[i];
          const tx   = await wallet.sendTransaction({ to: call.target, data: call.calldata });
          console.log(`[UGF]   call[${i}] hash=${tx.hash}`);
          await tx.wait();   // wait between calls so state is settled
          lastTx = tx;
        }
      } else {
        const call = quote.calls[0];
        lastTx     = await wallet.sendTransaction({ to: call.target, data: call.calldata });
        console.log(`[UGF]   single call hash=${lastTx.hash}`);
      }

      exec.txHash = lastTx!.hash;

      const receipt = await lastTx!.wait();
      exec.blockNumber = receipt?.blockNumber;
      exec.status      = "confirmed";

      console.log(`[UGF] ④ CONFIRMED ${lastTx!.hash} @ block ${receipt?.blockNumber}`);

    } catch (err: any) {
      console.error("[UGF] Execution failed:", err.message);
      exec.status = "failed";
      exec.error  = err.message || "Execution failed";
    }
  })();
});

// ── Phase 4: STATUS ──────────────────────────────────────────────────────────
router.post("/v1/status", async (req, res) => {
  const { executionId } = req.body;

  if (!executionId) {
    return res
      .status(400)
      .json({ error: { message: "executionId is required." } });
  }

  const exec = executions.get(executionId);
  if (!exec) {
    return res
      .status(404)
      .json({ error: { message: `Execution ${executionId} not found.` } });
  }

  res.json({
    executionId:     exec.executionId,
    status:          exec.status,
    transactionHash: exec.txHash,
    blockNumber:     exec.blockNumber,
    error:           exec.error,
  });
});

export default router;
