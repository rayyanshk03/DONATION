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
  // 1. Initialize UGF Client
  const client = new UGFClient({ baseUrl: UGF_ENDPOINT });
  const senderAddress = await signer.getAddress();

  // UGF chain and coin mappings matching Sepolia testnet rules
  const BASE_SEPOLIA_CHAIN_ID = "84532";
  const TYI_USD_PAYMENT_COIN = "TYI_MOCK_USD";

  if (String(chainId) !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(`UGF testnet supports Base Sepolia (chain ${BASE_SEPOLIA_CHAIN_ID}) only. Current: ${chainId}`);
  }

  // 2. Perform implicit/explicit relayer auth
  if (client.auth && typeof client.auth.login === "function") {
    await client.auth.login(signer);
  } else if (typeof (client as any).authenticate === "function") {
    await (client as any).authenticate(signer);
  } else if (typeof (client as any).login === "function") {
    await (client as any).login(signer);
  }

  // 3. Phase A: QUOTE
  const txObject = {
    from: senderAddress,
    to: to,
    data: data,
    value: "0",
  };

  let quote: any;
  if (client.quote && typeof client.quote.get === "function") {
    quote = await client.quote.get({
      payer_address: senderAddress,
      tx_object: JSON.stringify(txObject),
      payment_coin: TYI_USD_PAYMENT_COIN,
    });
  } else if (typeof (client as any).getQuote === "function") {
    quote = await (client as any).getQuote({
      payerAddress: senderAddress,
      txObject: txObject,
      paymentCoin: TYI_USD_PAYMENT_COIN,
    });
  } else {
    throw new Error("[UGF] Unable to locate quote interface in the UGFClient package.");
  }

  const quoteId = quote.quote_id || quote.quoteId || quote.digest || quote.id || "unknown";
  const gasCost = quote.settlement_amount || quote.settlementAmount || quote.cost || "0.00";

  if (onQuote) {
    onQuote({
      quoteId,
      gasCostUsd: gasCost,
      raw: quote,
    });
  }

  // 4. Phase B: SETTLE (Authorization of payment coin)
  if (client.payment && client.payment.x402 && typeof client.payment.x402.execute === "function") {
    await client.payment.x402.execute({ quote, signer });
  } else if (client.settle && typeof (client as any).settle === "function") {
    await (client as any).settle({ quote, signer });
  } else if (typeof (client as any).pay === "function") {
    await (client as any).pay({ quote, signer });
  } else if (client.payment && typeof (client as any).payment.settle === "function") {
    await (client as any).payment.settle({ quote, signer });
  }

  if (onSettle) {
    onSettle();
  }

  // 5. Phase C: EXECUTE (Sponsor and publish transaction to EVM nodes)
  let userTxHash: string | undefined;
  const quoteDigest = quote.digest || quote.quote_id || quote.quoteId || quote.id;

  if (client.chains && client.chains.evm && typeof client.chains.evm.sponsorAndExecute === "function") {
    const result = await client.chains.evm.sponsorAndExecute(
      quoteDigest,
      signer,
      async () => ({
        to: to,
        data: data,
        value: 0n,
      })
    );
    userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
  } else if (typeof (client as any).execute === "function") {
    const result = await (client as any).execute({
      quote,
      signer,
      txObject: { to, data, value: "0" },
    });
    userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
  } else if ((client as any).evm && typeof (client as any).evm.execute === "function") {
    const result = await (client as any).evm.execute(quoteDigest, signer, { to, data, value: 0n });
    userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
  }

  if (!userTxHash) {
    throw new Error("[UGF] Relayer execution completed but failed to resolve a transaction hash.");
  }

  if (onExecute) {
    onExecute(userTxHash);
  }

  // 6. Phase D: CONFIRM (Wait for mining receipt)
  let blockNumber = 0;
  try {
    console.log("[UGF] Waiting for transaction receipt confirmation on-chain:", userTxHash);
    const receipt = await provider.waitForTransaction(userTxHash);
    if (receipt) {
      blockNumber = receipt.blockNumber || 0;
      console.log("[UGF] Transaction successfully confirmed in block:", blockNumber);
    } else {
      console.warn("[UGF] Mined transaction receipt confirmation returned null, proceeding anyway.");
    }
  } catch (confirmErr: any) {
    console.warn("[UGF] Mined transaction receipt confirmation error or timeout, proceeding anyway:", confirmErr);
  }

  return {
    transactionHash: userTxHash,
    blockNumber,
  };
}
