import { ethers } from "ethers";
import { UGFClient } from "@tychilabs/ugf-testnet-js";

// ─── Environment Variables ───────────────────────────────────────────────────
export const UGC_TOKEN_ADDRESS = import.meta.env.VITE_UGC_TOKEN_ADDRESS || "0x27DC1C167AeF232bb1e21073304B526726a8727e";
export const DONATION_CONTRACT_ADDRESS = import.meta.env.VITE_DONATION_CONTRACT_ADDRESS || "0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c";
export const TARGET_CHAIN_ID = Number(import.meta.env.VITE_TARGET_CHAIN_ID || 84532);
export const UGF_ENDPOINT = import.meta.env.VITE_UGF_ENDPOINT || "https://gateway.universalgasframework.com";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

// ─── ABIs ────────────────────────────────────────────────────────────────────
export const UGC_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
];

export const VAULT_ABI = [
  "function donate(uint256 causeId, uint256 amount)",
  "function donateWithPermit(uint256 causeId, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function causes(uint256) view returns (address wallet, uint256 totalDonated, uint256 donorCount, bool active)",
];

// ─── UGF Status Types ────────────────────────────────────────────────────────
export type UgfPhase = "quoting" | "settling" | "executing" | "confirmed";

export interface UgfQuote {
  quoteId: string;
  gasCostUsd: string;
  raw: any;
}

export interface UgfTxOptions {
  signer: ethers.Signer;
  provider: ethers.Provider;
  chainId: number;
  to: string;
  data: string;
  onQuote?: (quote: UgfQuote) => void;
  onSettle?: () => void;
  onExecute?: (txHash: string) => void;
}

// ─── EIP-2612 Permit Handler ─────────────────────────────────────────────────
/**
 * Builds and requests an EIP-2612 permit signature from the connected wallet.
 */
export async function tryPermitSignature(
  signer: ethers.Signer,
  tokenAddress: string,
  spenderAddress: string,
  amountWei: bigint,
  chainId: number
): Promise<{ deadline: number; v: number; r: string; s: string } | null> {
  try {
    const ugcToken = new ethers.Contract(tokenAddress, UGC_TOKEN_ABI, signer);
    const ownerAddress = await signer.getAddress();

    // 1. Fetch dynamic token parameter nonces & standard name
    const [nonce, tokenName] = await Promise.all([
      ugcToken.nonces(ownerAddress),
      ugcToken.name(),
    ]);

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

    const domain = {
      name: tokenName,
      version: "1",
      chainId: chainId,
      verifyingContract: tokenAddress,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: ownerAddress,
      spender: spenderAddress,
      value: amountWei,
      nonce: nonce,
      deadline: deadline,
    };

    // 2. Request signature
    let rawSig;
    try {
      rawSig = await signer.signTypedData(domain, types, message);
    } catch (sigErr: any) {
      const isRejected = 
        sigErr.code === 4001 || 
        sigErr.code === "ACTION_REJECTED" || 
        sigErr.message?.toLowerCase().includes("rejected") || 
        sigErr.message?.toLowerCase().includes("cancel");
      if (isRejected) {
        const rejectError = new Error("User rejected the permit signature request.");
        (rejectError as any).isUserRejection = true;
        throw rejectError;
      }
      throw sigErr;
    }
    const sig = ethers.Signature.from(rawSig);

    return {
      deadline,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    };
  } catch (err: any) {
    if (err.isUserRejection) {
      throw err;
    }
    console.warn("[Permit] Permit signature request failed or unsupported. Falling back to approve(). Details:", err);
    return null;
  }
}

// ─── UGF Relayer Dispatcher ──────────────────────────────────────────────────
/**
 * Initiates the gasless multi-step dispatch via the official UGF SDK.
 */
export async function sendUGFDonation({
  signer,
  provider,
  chainId,
  to,
  data,
  onQuote,
  onSettle,
  onExecute,
}: UgfTxOptions): Promise<{ transactionHash: string; blockNumber: number }> {
  const senderAddress = await signer.getAddress();

  // UGF chain mappings matching Sepolia testnet rules
  const BASE_SEPOLIA_CHAIN_ID = "84532";
  if (String(chainId) !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(`UGF testnet supports Base Sepolia (chain ${BASE_SEPOLIA_CHAIN_ID}) only. Current: ${chainId}`);
  }

  // 1. Phase A: QUOTE
  const calls = [{ target: to, calldata: data, value: "0" }];
  
  const quoteRes = await fetch(`${BACKEND_URL}/api/v1/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: senderAddress,
      chainId,
      calls,
    }),
  });

  if (!quoteRes.ok) {
    const errorData = await quoteRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Quote request failed with status ${quoteRes.status}`);
  }

  const quote = await quoteRes.json();
  const quoteId = quote.quoteId;
  const gasCost = quote.gasCostUsd;

  if (onQuote) {
    onQuote({
      quoteId,
      gasCostUsd: gasCost,
      raw: quote,
    });
  }

  // 2. Phase B: SETTLE (Request auth signature and submit)
  const authMessage =
    `CryptoAid UGF Authorization\n\nQuote: ${quoteId}\nChain: 84532\n` +
    `Gas: ${gasCost} Mock USD\n\nI authorize UGF to execute this gasless transaction.`;
  
  let signature: string;
  try {
    signature = await signer.signMessage(authMessage);
  } catch (sigErr: any) {
    const isRejected = 
      sigErr.code === 4001 || 
      sigErr.code === "ACTION_REJECTED" || 
      sigErr.message?.toLowerCase().includes("rejected") || 
      sigErr.message?.toLowerCase().includes("cancel");
    if (isRejected) {
      const rejectError = new Error("User rejected the UGF sponsorship signature request.");
      (rejectError as any).isUserRejection = true;
      throw rejectError;
    }
    throw sigErr;
  }

  const settleRes = await fetch(`${BACKEND_URL}/api/v1/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteId,
      signature,
    }),
  });

  if (!settleRes.ok) {
    const errorData = await settleRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Settle request failed with status ${settleRes.status}`);
  }

  const settlement = await settleRes.json();
  const settlementId = settlement.settlementId;

  if (onSettle) {
    onSettle();
  }

  // 3. Phase C: EXECUTE (Sponsor and publish transaction)
  const executeRes = await fetch(`${BACKEND_URL}/api/v1/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settlementId,
    }),
  });

  if (!executeRes.ok) {
    const errorData = await executeRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Execute request failed with status ${executeRes.status}`);
  }

  const execution = await executeRes.json();
  const executionId = execution.executionId;

  // 4. Phase D: CONFIRM (Poll status until mined)
  let transactionHash = "";
  let blockNumber = 0;
  let confirmed = false;

  for (let i = 0; i < 45; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const statusRes = await fetch(`${BACKEND_URL}/api/v1/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId,
      }),
    });

    if (!statusRes.ok) {
      console.warn("[UGF] Status check failed, retrying...");
      continue;
    }

    const statusData = await statusRes.json();
    if (statusData.status === "confirmed") {
      transactionHash = statusData.transactionHash;
      blockNumber = statusData.blockNumber || 0;
      confirmed = true;
      break;
    } else if (statusData.status === "failed") {
      throw new Error(statusData.error || "Transaction execution failed on-chain.");
    }
  }

  if (!confirmed) {
    throw new Error("Timeout waiting for transaction confirmation on-chain.");
  }

  if (onExecute && transactionHash) {
    onExecute(transactionHash);
  }

  return {
    transactionHash,
    blockNumber,
  };
}
