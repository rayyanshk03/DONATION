import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap, Check, ShieldCheck, ArrowRight, Twitter, ExternalLink, RefreshCw, KeyRound, ArrowUpRight, HelpCircle } from "lucide-react";
import { Campaign, Donation } from "../types";
import { generateRandomHash } from "../mockData";
import { ethers } from "ethers";
import {
  UGC_TOKEN_ADDRESS,
  DONATION_CONTRACT_ADDRESS,
  TARGET_CHAIN_ID,
  UGC_TOKEN_ABI,
  VAULT_ABI,
  tryPermitSignature,
  sendUGFDonation,
} from "../web3Service";


interface DonationModalProps {
  campaign: Campaign | null;
  walletConnected: boolean;
  walletBalance: number;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  onClose: () => void;
  onDonationComplete: (amount: number, txHash: string) => void;
  onConnectWallet: () => void;
}

type ModalStep = "amount" | "processing" | "success";

export default function DonationModal({
  campaign,
  walletConnected,
  walletBalance,
  provider,
  signer,
  onClose,
  onDonationComplete,
  onConnectWallet,
}: DonationModalProps) {
  if (!campaign) return null;

  const [step, setStep] = useState<ModalStep>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [gaslessPermitPhase, setGaslessPermitPhase] = useState<"not_started" | "signing" | "sending" | "complete">("not_started");
  const [isPreApproved, setIsPreApproved] = useState<boolean>(false);
  const [isFallbackApprove, setIsFallbackApprove] = useState<boolean>(false);
  const [currentStepNum, setCurrentStepNum] = useState<1 | 2>(1);
  const [ugfStepStatus, setUgfStepStatus] = useState<"quoting" | "settling" | "executing" | "confirmed">("quoting");
  const [completionTxHash, setCompletionTxHash] = useState<string>("");
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; duration: number; size: number }>>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [ugfGasFee, setUgfGasFee] = useState<string>("0.0025");

  const presets = [10, 25, 50, 100];
  const finalAmount = useCustom ? (parseFloat(customAmountStr) || 0) : selectedAmount;

  // Generate confetti elements on success
  useEffect(() => {
    if (step === "success") {
      const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b"];
      const newConfetti = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100, // percentage string
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 2 + Math.random() * 2, // seconds
        size: 4 + Math.random() * 6, // px
      }));
      setConfetti(newConfetti);
    } else {
      setConfetti([]);
    }
  }, [step]);

  // Handle amount option selecting
  const handlePresetSelect = (amt: number) => {
    setUseCustom(false);
    setSelectedAmount(amt);
    setModalError(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseCustom(true);
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCustomAmountStr(val);
      setModalError(null);
    }
  };

  const handleClose = () => {
    if (step === "success") {
      onDonationComplete(finalAmount, completionTxHash);
    } else {
      onClose();
    }
  };

  // Execute Gasless Web3 EIP-2612 and Multi-Transaction Approval via Universal Gas Framework
  const handleInitiateDonation = async () => {
    if (!walletConnected) {
      setModalError("Please connect your wallet first.");
      return;
    }

    if (finalAmount <= 0) {
      setModalError("Please specify a valid donation amount.");
      return;
    }

    if (finalAmount > walletBalance) {
      setModalError("Insufficient UGC token balance inside your wallet.");
      return;
    }

    if (!signer || !provider) {
      setModalError("Web3 provider or wallet signer is not available.");
      return;
    }

    // Reset flow indicators and move to step 2: processing
    setIsPreApproved(false);
    setIsFallbackApprove(false);
    setStep("processing");
    setModalError(null);
    setCurrentStepNum(1);
    setUgfStepStatus("quoting");

    try {
      // 1. Get decimals and format finalAmount to BigInt
      const tokenContract = new ethers.Contract(UGC_TOKEN_ADDRESS, UGC_TOKEN_ABI, provider);
      const decimalsVal = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(finalAmount.toString(), decimalsVal);

      // 2. Query current allowance
      const userAddress = await signer.getAddress();
      setGaslessPermitPhase("signing"); // Start in signature authorization phase
      
      const allowance = await tokenContract.allowance(userAddress, DONATION_CONTRACT_ADDRESS);

      if (allowance >= amountWei) {
        console.log("[DonationModal] Sufficient allowance exists. Sponsoring direct donation...");
        setIsPreApproved(true);
        
        // Flow A: Direct donation
        const vaultIface = new ethers.Interface(VAULT_ABI);
        const calldata = vaultIface.encodeFunctionData("donate", [BigInt(campaign.id), amountWei]);
        
        setGaslessPermitPhase("sending");
        setUgfStepStatus("quoting");
        const result = await sendUGFDonation({
          signer,
          provider,
          chainId: TARGET_CHAIN_ID,
          to: DONATION_CONTRACT_ADDRESS,
          data: calldata,
          onQuote: (quote) => {
            setUgfStepStatus("quoting");
            setUgfGasFee(quote.gasCostUsd);
          },
          onSettle: () => {
            setUgfStepStatus("settling");
          },
          onExecute: (txHash) => {
            setUgfStepStatus("executing");
            setCompletionTxHash(txHash);
          }
        });

        setCompletionTxHash(result.transactionHash);
        setUgfStepStatus("confirmed");
        setGaslessPermitPhase("complete");
        setStep("success");
      } else {
        console.log("[DonationModal] Insufficient allowance. Initiating EIP-2612 Permit...");
        
        // Flow B & C: Request off-chain permit
        let permit = null;
        try {
          permit = await tryPermitSignature(
            signer,
            UGC_TOKEN_ADDRESS,
            DONATION_CONTRACT_ADDRESS,
            amountWei,
            TARGET_CHAIN_ID
          );
        } catch (sigErr: any) {
          if (sigErr.isUserRejection) {
            console.log("[DonationModal] User explicitly rejected permit signature request. Aborting.");
            setStep("amount");
            setGaslessPermitPhase("not_started");
            setModalError("Signature request was cancelled.");
            return;
          }
          throw sigErr;
        }

        if (permit) {
          console.log("[DonationModal] Permit signature acquired. Relaying single permit-donation transaction...");
          
          // Flow B: Single-transaction permit donation
          const vaultIface = new ethers.Interface(VAULT_ABI);
          const calldata = vaultIface.encodeFunctionData("donateWithPermit", [
            BigInt(campaign.id),
            amountWei,
            BigInt(permit.deadline),
            permit.v,
            permit.r,
            permit.s
          ]);

          setGaslessPermitPhase("sending");
          setUgfStepStatus("quoting");
          const result = await sendUGFDonation({
            signer,
            provider,
            chainId: TARGET_CHAIN_ID,
            to: DONATION_CONTRACT_ADDRESS,
            data: calldata,
            onQuote: (quote) => {
              setUgfStepStatus("quoting");
              setUgfGasFee(quote.gasCostUsd);
            },
            onSettle: () => {
              setUgfStepStatus("settling");
            },
            onExecute: (txHash) => {
              setUgfStepStatus("executing");
              setCompletionTxHash(txHash);
            }
          });

          setCompletionTxHash(result.transactionHash);
          setUgfStepStatus("confirmed");
          setGaslessPermitPhase("complete");
          setStep("success");
        } else {
          console.log("[DonationModal] Permit failed/unsupported. Falling back to multi-step approve + donate...");
          setIsFallbackApprove(true);
          
          // Flow C: Standard approve followed by donate
          // Step 1: Approve
          const approveCalldata = tokenContract.interface.encodeFunctionData("approve", [DONATION_CONTRACT_ADDRESS, amountWei]);
          
          setUgfStepStatus("quoting");
          await sendUGFDonation({
            signer,
            provider,
            chainId: TARGET_CHAIN_ID,
            to: UGC_TOKEN_ADDRESS,
            data: approveCalldata,
            onQuote: (quote) => {
              setUgfStepStatus("quoting");
              setUgfGasFee(quote.gasCostUsd);
            },
            onSettle: () => {
              setUgfStepStatus("settling");
            },
            onExecute: (txHash) => {
              setUgfStepStatus("executing");
            }
          });

          setUgfStepStatus("confirmed");
          console.log("[DonationModal] Fallback approve tx confirmed. Waiting for allowance to update on-chain...");

          // Polling verification loop to ensure allowance propagation has fully registered
          let allowanceUpdated = false;
          for (let i = 0; i < 15; i++) {
            const currentAllowance = await tokenContract.allowance(userAddress, DONATION_CONTRACT_ADDRESS);
            if (currentAllowance >= amountWei) {
              allowanceUpdated = true;
              console.log("[DonationModal] Allowance propagation confirmed:", currentAllowance.toString());
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          if (!allowanceUpdated) {
            console.warn("[DonationModal] Allowance did not update within timeout. Proceeding anyway...");
          }

          // Step 2: Donate
          const vaultIface = new ethers.Interface(VAULT_ABI);
          const calldata = vaultIface.encodeFunctionData("donate", [BigInt(campaign.id), amountWei]);
          
          setCurrentStepNum(2);
          setGaslessPermitPhase("sending");
          setUgfStepStatus("quoting");

          const result = await sendUGFDonation({
            signer,
            provider,
            chainId: TARGET_CHAIN_ID,
            to: DONATION_CONTRACT_ADDRESS,
            data: calldata,
            onQuote: (quote) => {
              setUgfStepStatus("quoting");
              setUgfGasFee(quote.gasCostUsd);
            },
            onSettle: () => {
              setUgfStepStatus("settling");
            },
            onExecute: (txHash) => {
              setUgfStepStatus("executing");
              setCompletionTxHash(txHash);
            }
          });

          setCompletionTxHash(result.transactionHash);
          setUgfStepStatus("confirmed");
          setGaslessPermitPhase("complete");
          setStep("success");
        }
      }
    } catch (err: any) {
      console.error("[DonationModal] Error during gasless flow execution:", err);
      setModalError(err.userMessage || err.message || "An unexpected error occurred during execution.");
      setStep("amount");
      setGaslessPermitPhase("not_started");
    }
  };

  const getStep1Status = () => {
    if (isPreApproved) {
      return {
        title: "Allowance Pre-Authorized",
        desc: "Sufficient allowance detected. Skipping approval signature step.",
        badge: "Pre-Approved",
        icon: "success",
        isActive: false,
        isCompleted: true,
      };
    }

    if (isFallbackApprove) {
      if (currentStepNum === 1) {
        let desc = "Executing gasless approval via Universal Gas Framework...";
        let badge = "Preparing...";
        if (ugfStepStatus === "quoting") {
          desc = "Estimating network sponsor quote for approval...";
          badge = "Quoting Sponsor";
        } else if (ugfStepStatus === "settling") {
          desc = "Please authorize the gas sponsorship signature in your wallet...";
          badge = "Awaiting Sign";
        } else if (ugfStepStatus === "executing") {
          desc = "Broadcasting sponsored approval transaction on Base Sepolia...";
          badge = "Relaying Tx";
        } else if (ugfStepStatus === "confirmed") {
          desc = "Approval confirmed on-chain! Polling allowance propagation...";
          badge = "Indexing";
        }
        return {
          title: "Step 1/2: Gasless Token Approval",
          desc,
          badge,
          icon: "loading",
          isActive: true,
          isCompleted: false,
        };
      } else {
        return {
          title: "Step 1/2: Gasless Token Approval",
          desc: "Sponsored approval transaction successful and confirmed on Base Sepolia!",
          badge: "Confirmed",
          icon: "success",
          isActive: false,
          isCompleted: true,
        };
      }
    }

    // Otherwise, EIP-2612 Permit Signing
    if (gaslessPermitPhase === "signing") {
      return {
        title: "EIP-2612 Permit Signature",
        desc: "Awaiting your secure cryptographic authorization signature in MetaMask...",
        badge: "Awaiting Sign",
        icon: "signature",
        isActive: true,
        isCompleted: false,
      };
    } else {
      return {
        title: "EIP-2612 Permit Signature",
        desc: "Cryptographic allowance signature securely signed and stored.",
        badge: "Authorized",
        icon: "success",
        isActive: false,
        isCompleted: true,
      };
    }
  };

  const getStep2Status = () => {
    const step1 = getStep1Status();
    
    if (!step1.isCompleted) {
      return {
        title: isFallbackApprove ? "Step 2/2: Gasless Donation Submission" : "UGF Gasless Submission",
        desc: "Awaiting token approval completion before initiating sponsored donation...",
        badge: "Pending",
        icon: "pending",
        isActive: false,
        isCompleted: false,
      };
    }

    const isCompleted = gaslessPermitPhase === "complete" || ugfStepStatus === "confirmed";
    
    if (isCompleted) {
      return {
        title: isFallbackApprove ? "Step 2/2: Gasless Donation Submission" : "UGF Gasless Submission",
        desc: "Sponsored donation transaction completed and successfully minted on Base Sepolia!",
        badge: "Confirmed",
        icon: "success",
        isActive: false,
        isCompleted: true,
      };
    }

    let desc = "Relaying gasless donation payload to Universal Gas Framework relayer...";
    let badge = "Preparing...";
    if (ugfStepStatus === "quoting") {
      desc = "Estimating sponsored gas quote for donation execution...";
      badge = "Quoting Sponsor";
    } else if (ugfStepStatus === "settling") {
      desc = "Please authorize the gasless donation settlement signature in your wallet...";
      badge = "Awaiting Sign";
    } else if (ugfStepStatus === "executing") {
      desc = "Minting your donation block on Base Sepolia via UGF gas relays...";
      badge = "Relaying Tx";
    }

    return {
      title: isFallbackApprove ? "Step 2/2: Gasless Donation Submission" : "UGF Gasless Submission",
      desc,
      badge,
      icon: "loading",
      isActive: true,
      isCompleted: false,
    };
  };

  const step1 = getStep1Status();
  const step2 = getStep2Status();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Darkened blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step !== "processing" ? handleClose : undefined}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, type: "spring", damping: 25 }}
          className="glass-panel w-full max-w-lg rounded-2xl border-white/10 overflow-hidden shadow-2xl relative z-10 bg-[#0c0c15]"
        >
          {/* Confetti generator */}
          {step === "success" && (
            <div className="confetti-container">
              {confetti.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ y: -20, opacity: 1, rotate: 0 }}
                  animate={{ y: 550, opacity: 0, rotate: 360 }}
                  transition={{ duration: c.duration, ease: "linear" }}
                  style={{
                    position: "absolute",
                    left: `${c.left}%`,
                    width: c.size,
                    height: c.size,
                    backgroundColor: c.color,
                    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                  }}
                />
              ))}
            </div>
          )}

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/5 p-6 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{campaign.icon}</span>
              <div>
                <h3 className="text-md font-bold text-white">Gasless Donation</h3>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[280px]">
                  {campaign.title}
                </p>
              </div>
            </div>
            
            {step !== "processing" && (
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {/* Step content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              
              {/* Step A: Choose Amount */}
              {step === "amount" && (
                <motion.div
                  key="choose-amount"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {/* Campaign summary info card */}
                  <div className="rounded-xl bg-white/[0.01] border border-white/5 p-4 flex flex-col gap-1 text-xs">
                    <span className="text-slate-400 font-medium">Beneficiary Cause</span>
                    <span className="text-white font-semibold flex items-center gap-2">
                      {campaign.title} 
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 py-0.5 px-2 rounded-full font-mono border border-blue-500/10 uppercase font-bold">{campaign.category}</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {campaign.description}
                    </p>
                  </div>

                  {/* Amount Select Section */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase block mb-3">
                      Select Giving Amount ($UGC)
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {presets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePresetSelect(p)}
                          className={`relative py-3 rounded-xl font-bold font-mono text-sm border transition-all cursor-pointer ${
                            !useCustom && selectedAmount === p
                              ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                              : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10"
                          }`}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>

                    {/* Custom input */}
                    <div className="mt-4 relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 font-bold font-mono">
                        $
                      </div>
                      <input
                        type="text"
                        value={customAmountStr}
                        placeholder="Enter other custom amount"
                        onChange={handleCustomChange}
                        className="w-full glass-input pl-8 pr-16 py-3 font-mono font-bold text-sm text-white"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[11px] text-slate-500 font-mono uppercase">
                        UGC TOKENS
                      </div>
                    </div>
                  </div>

                  {/* Gas Details Panel */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4.5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Donation Value</span>
                      <span className="text-white font-medium font-mono">${finalAmount.toFixed(2)} UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Gas Abstraction</span>
                      <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 uppercase">
                        <Zap className="h-3 w-3 fill-emerald-400/20" /> Paid in UGC via UGF
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-2">
                      <span>Estimated Network Fee (ETH)</span>
                      <span className="font-mono text-slate-500 line-through">0.0015 ETH ($4.12)</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>UGF Gas Fee (UGC)</span>
                      <span className="font-mono text-emerald-400 font-semibold">~$0.0025 UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-t border-white/5 pt-2">
                      <span>Final Cost (Zero ETH)</span>
                      <span className="text-blue-400 font-mono font-extrabold">${(finalAmount + 0.0025).toFixed(4)} UGC</span>
                    </div>
                  </div>

                  {/* Balance checker banner */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Your Wallet Balance:</span>
                    <span className="font-mono text-slate-300 font-semibold">{walletBalance.toFixed(2)} UGC</span>
                  </div>

                  {/* Error display */}
                  {modalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl font-medium">
                      {modalError}
                    </div>
                  )}

                  {/* Interactive Button */}
                  {!walletConnected ? (
                    <button
                      type="button"
                      onClick={onConnectWallet}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 rounded-xl font-bold text-sm text-white cursor-pointer shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Connect Wallet First</span>
                    </button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleInitiateDonation}
                      className="w-full relative py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm cursor-pointer shadow-xl shadow-blue-500/15 group overflow-hidden flex items-center justify-center gap-2 hover:brightness-110"
                    >
                      <Zap className="h-4 w-4 text-emerald-300 fill-emerald-300/10" />
                      <span>Approve & Give Gasless</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Step B: Processing flow (Permit signing & Transaction submission) */}
              {step === "processing" && (
                <motion.div
                  key="processing-flow"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center space-y-8"
                >
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    {/* Animated Loader Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-purple-500 border-b-emerald-500 border-l-transparent"
                    />

                    {/* Central Dynamic Icon depending on UGF sub-step */}
                    {step2.isActive ? (
                      <Zap className="h-8 w-8 text-purple-400 fill-purple-400/20 animate-neon-pulse" />
                    ) : step1.isActive && step1.icon === "signature" ? (
                      <KeyRound className="h-8 w-8 text-blue-400 animate-float" />
                    ) : step1.isActive ? (
                      <ShieldCheck className="h-8 w-8 text-blue-400 animate-float" />
                    ) : (
                      <Zap className="h-8 w-8 text-emerald-400 fill-emerald-400/20 animate-neon-pulse" />
                    )}
                  </div>

                  {/* Active Campaign Detail Banner */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 max-w-sm mx-auto shadow-inner">
                    <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mb-1">Supporting Campaign</p>
                    <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <span>{campaign.icon}</span>
                      <span className="truncate">{campaign.title}</span>
                    </h4>
                  </div>

                  {/* Unified Steps Status Bar */}
                  <div className="space-y-4 max-w-sm mx-auto">
                    {/* Phase 1 Status */}
                    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-xs text-left ${
                      step1.isActive
                        ? "bg-blue-500/5 border-blue-500/25 text-white font-semibold shadow-md shadow-blue-500/5"
                        : step1.isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/15 text-slate-300 font-medium"
                        : "bg-white/[0.01] border-white/5 text-slate-500"
                    }`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
                        step1.isCompleted
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : step1.isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
                          : "bg-white/5 border border-white/5 text-slate-500"
                      }`}>
                        {step1.isCompleted ? <Check className="h-3.5 w-3.5" /> : "1"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{step1.title}</p>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            step1.isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                              : step1.isActive
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/10 animate-pulse"
                              : "bg-white/5 text-slate-600"
                          }`}>
                            {step1.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5 leading-normal">
                          {step1.desc}
                        </p>
                      </div>
                      {step1.isActive && (
                        step1.icon === "loading" ? (
                          <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                        ) : step1.icon === "signature" ? (
                          <KeyRound className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                        ) : null
                      )}
                    </div>

                    {/* Phase 2 Status */}
                    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-xs text-left ${
                      step2.isActive
                        ? "bg-purple-500/5 border-purple-500/25 text-white font-semibold shadow-md shadow-purple-500/5"
                        : step2.isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/15 text-slate-300 font-medium"
                        : "bg-white/[0.01] border-white/5 text-slate-500"
                    }`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
                        step2.isCompleted
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : step2.isActive
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20 font-bold"
                          : "bg-white/5 border border-white/5 text-slate-500"
                      }`}>
                        {step2.isCompleted ? <Check className="h-3.5 w-3.5" /> : "2"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{step2.title}</p>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            step2.isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                              : step2.isActive
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/10 animate-pulse"
                              : "bg-white/5 text-slate-600"
                          }`}>
                            {step2.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5 leading-normal">
                          {step2.desc}
                        </p>
                      </div>
                      {step2.isActive && (
                        <RefreshCw className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      )}
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs font-mono max-w-xs mx-auto">
                    Note: Your browser client coordinates are communicating directly with on-chain contracts on Base Sepolia.
                  </p>
                </motion.div>
              )}

              {/* Step C: Success Celebration & Sharing */}
              {step === "success" && (
                <motion.div
                  key="success-celebration"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Success Header Badge */}
                  <div className="text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                      <Check className="h-7 w-7 text-emerald-400" />
                    </div>
                    <h4 className="text-2xl font-bold text-white tracking-tight">Donation Successful!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Your gasless gift of <span className="text-emerald-400 font-bold font-mono">${finalAmount} UGC</span> has been successfully sponsorship-routed via UGF networks.
                    </p>
                  </div>

                  {/* Simulated Receipt details block */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5.5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Donation Gift</span>
                      <span className="text-emerald-400 font-bold font-mono">${finalAmount} UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>To Campaign</span>
                      <span className="text-white font-medium">{campaign.title}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>UGF Network Fee (Paid in UGC)</span>
                      <span className="text-purple-400 font-bold font-mono flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-purple-400 animate-pulse" /> ${ugfGasFee} UGC (Zero ETH)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
                      <span className="text-slate-400 font-mono">TX Hash Explorer:</span>
                      <a
                        href={`https://sepolia.basescan.org/tx/${completionTxHash}`}
                        target="_blank"
                        rel="referrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-xs flex items-center gap-1 group/link cursor-pointer"
                      >
                        <span className="underline underline-offset-2">
                          {completionTxHash ? `${completionTxHash.slice(0, 8)}...${completionTxHash.slice(-8)}` : ""}
                        </span>
                        <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>

                  {/* Social share widget card */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-4.5 text-xs text-left relative overflow-hidden flex flex-col gap-2.5">
                    <span className="font-bold text-blue-400 flex items-center gap-2 uppercase tracking-wide text-[10px]">
                      <Twitter className="h-3.5 w-3.5" /> Share Your Impact on Twitter / X
                    </span>
                    <p className="font-light text-slate-300 leading-relaxed italic bg-black/30 p-2.5 rounded-lg border border-white/5">
                      "I just donated ${finalAmount} gasless to Restore Amazonian Rainforests on CryptoAid! Sponsored by UGF 🌳🚀"
                    </p>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `I just made a gasless donation of $${finalAmount} UGC to restore rainforests on @CryptoAid via the Universal Gas Facilitation protocol! 🌳🚀`
                      )}`}
                      target="_blank"
                      rel="referrer"
                      className="inline-flex self-start items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-3.5 py-1.5 transition-colors text-xs font-sans cursor-pointer mt-1"
                    >
                      <span>Share on X</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Footer Complete CTA */}
                  <button
                    onClick={handleClose}
                    className="w-full bg-white text-slate-950 hover:bg-slate-100 py-3 rounded-xl font-bold text-sm transition-colors text-center block cursor-pointer shadow-lg shadow-black/40"
                  >
                    Done
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
