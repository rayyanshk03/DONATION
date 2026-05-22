import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap, Check, ShieldCheck, ArrowRight, Twitter, ExternalLink, RefreshCw, KeyRound, ArrowUpRight, HelpCircle, Leaf, Droplets, GraduationCap, Globe, Wallet, Lock } from "lucide-react";
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

const getCategoryTheme = (category: string) => {
  switch (category) {
    case "Environmental":
      return {
        accent: "emerald",
        badgeBg: "bg-emerald-500/10",
        badgeText: "text-emerald-450 border-emerald-500/20",
        buttonGrad: "from-emerald-400 via-teal-500 to-emerald-600 hover:from-emerald-300 hover:via-teal-400 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]",
        focusBorder: "focus-within:border-emerald-500/40 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.08)]",
        presetActive: "bg-emerald-500/10 text-emerald-450 border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        textAccent: "text-emerald-450",
        iconColor: "text-emerald-400",
        glowBg: "bg-emerald-500/20",
      };
    case "Humanitarian":
      return {
        accent: "blue",
        badgeBg: "bg-blue-500/10",
        badgeText: "text-blue-450 border-blue-500/20",
        buttonGrad: "from-blue-400 via-sky-500 to-indigo-600 hover:from-blue-300 hover:via-sky-400 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]",
        focusBorder: "focus-within:border-blue-500/40 focus-within:shadow-[0_0_12px_rgba(59,130,246,0.08)]",
        presetActive: "bg-blue-500/10 text-blue-450 border-blue-500/35 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
        textAccent: "text-blue-455",
        iconColor: "text-blue-400",
        glowBg: "bg-blue-500/20",
      };
    case "Education":
      return {
        accent: "purple",
        badgeBg: "bg-purple-500/10",
        badgeText: "text-purple-400 border-purple-500/20",
        buttonGrad: "from-purple-400 via-fuchsia-500 to-pink-600 hover:from-purple-300 hover:via-fuchsia-400 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]",
        focusBorder: "focus-within:border-purple-500/40 focus-within:shadow-[0_0_12px_rgba(168,85,247,0.08)]",
        presetActive: "bg-purple-500/10 text-purple-450 border-purple-500/35 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
        textAccent: "text-purple-455",
        iconColor: "text-purple-400",
        glowBg: "bg-purple-500/20",
      };
    default:
      return {
        accent: "slate",
        badgeBg: "bg-slate-500/10",
        badgeText: "text-slate-400 border-slate-500/20",
        buttonGrad: "from-slate-500 via-slate-600 to-slate-700 hover:from-slate-400 hover:via-slate-500 hover:to-slate-600 shadow-slate-950/20 focus:ring-slate-500/20",
        focusBorder: "focus-within:border-slate-500/40",
        presetActive: "bg-slate-500/10 text-slate-400 border-slate-500/35 shadow-[0_0_12px_rgba(148,163,184,0.15)]",
        textAccent: "text-slate-400",
        iconColor: "text-slate-400",
        glowBg: "bg-slate-550/20",
      };
  }
};

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

  const theme = getCategoryTheme(campaign.category);

  const [step, setStep] = useState<ModalStep>("amount");
  const [customAmountStr, setCustomAmountStr] = useState<string>("25");
  const [gaslessPermitPhase, setGaslessPermitPhase] = useState<"not_started" | "signing" | "sending" | "complete">("not_started");
  const [isPreApproved, setIsPreApproved] = useState<boolean>(false);
  const [isFallbackApprove, setIsFallbackApprove] = useState<boolean>(false);
  const [currentStepNum, setCurrentStepNum] = useState<1 | 2>(1);
  const [ugfStepStatus, setUgfStepStatus] = useState<"quoting" | "settling" | "executing" | "confirmed">("quoting");
  const [completionTxHash, setCompletionTxHash] = useState<string>("");
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; duration: number; size: number }>>([]);
  const [modalError, setModalError] = useState<string | null>(null);

  const presets = [10, 25, 50, 100];
  const finalAmount = parseFloat(customAmountStr) || 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Environmental":
        return <Leaf className="h-4.5 w-4.5 text-emerald-450" />;
      case "Humanitarian":
        return <Droplets className="h-4.5 w-4.5 text-blue-450" />;
      case "Education":
        return <GraduationCap className="h-4.5 w-4.5 text-purple-450" />;
      default:
        return <Globe className="h-4.5 w-4.5 text-slate-405" />;
    }
  };

  useEffect(() => {
    if (step === "success") {
      const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b"];
      const newConfetti = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 2 + Math.random() * 2,
        size: 4 + Math.random() * 6,
      }));
      setConfetti(newConfetti);
    } else {
      setConfetti([]);
    }
  }, [step]);

  const handlePresetSelect = (amt: number) => {
    setCustomAmountStr(amt.toString());
    setModalError(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsPreApproved(false);
    setIsFallbackApprove(false);
    setStep("processing");
    setModalError(null);
    setCurrentStepNum(1);
    setUgfStepStatus("quoting");

    try {
      const tokenContract = new ethers.Contract(UGC_TOKEN_ADDRESS, UGC_TOKEN_ABI, provider);
      const decimalsVal = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(finalAmount.toString(), decimalsVal);
      const userAddress = await signer.getAddress();
      setGaslessPermitPhase("signing");
      
      const allowance = await tokenContract.allowance(userAddress, DONATION_CONTRACT_ADDRESS);

      if (allowance >= amountWei) {
        console.log("[DonationModal] Sufficient allowance exists. Sponsoring direct donation...");
        setIsPreApproved(true);
        
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
        let desc = "Executing ETH-Free approval via Universal Gas Framework (UGC Gas)...";
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
          title: "Step 1/2: ETH-Free Token Approval",
          desc,
          badge,
          icon: "loading",
          isActive: true,
          isCompleted: false,
        };
      } else {
        return {
          title: "Step 1/2: ETH-Free Token Approval",
          desc: "Sponsored approval transaction successful and confirmed on Base Sepolia!",
          badge: "Confirmed",
          icon: "success",
          isActive: false,
          isCompleted: true,
        };
      }
    }

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
        title: isFallbackApprove ? "Step 2/2: ETH-Free Donation Submission" : "UGF ETH-Free Submission",
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
        title: isFallbackApprove ? "Step 2/2: ETH-Free Donation Submission" : "UGF ETH-Free Submission",
        desc: "Sponsored donation transaction completed and successfully minted on Base Sepolia!",
        badge: "Confirmed",
        icon: "success",
        isActive: false,
        isCompleted: true,
      };
    }

    let desc = "Relaying ETH-Free donation payload to Universal Gas Framework relayer with UGC Gas...";
    let badge = "Preparing...";
    if (ugfStepStatus === "quoting") {
      desc = "Estimating sponsored gas quote for donation execution...";
      badge = "Quoting Sponsor";
    } else if (ugfStepStatus === "settling") {
      desc = "Please authorize the ETH-Free donation settlement signature in your wallet (gas paid in Mock USD)...";
      badge = "Awaiting Sign";
    } else if (ugfStepStatus === "executing") {
      desc = "Minting your donation block on Base Sepolia via UGF gas relays...";
      badge = "Relaying Tx";
    }

    return {
      title: isFallbackApprove ? "Step 2/2: ETH-Free Donation Submission" : "UGF ETH-Free Submission",
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
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ duration: 0.35, type: "spring", damping: 25 }}
          className="w-full max-w-[460px] rounded-2xl border border-white/[0.06] bg-[#0c0c15] overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] relative z-10"
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
          <div className="flex items-center justify-between border-b border-white/[0.04] p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] flex items-center justify-center relative shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.04)]`}>
                <div className={`absolute -inset-1 rounded-xl filter blur-sm opacity-20 ${theme.glowBg}`} />
                <div className="relative z-10">
                  {getCategoryIcon(campaign.category)}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  ETH-Free Donation
                </h3>
                <span className="text-[10px] text-slate-500 font-light block max-w-[180px] truncate">{campaign.title}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Live Network Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono select-none font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Base Sepolia
              </div>
              {step !== "processing" && (
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 text-slate-450 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>

          {/* Step content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              
              {/* Step A: Choose Amount */}
              {step === "amount" && (
                <motion.div
                  key="choose-amount"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  {/* Campaign summary info card */}
                  <div className="rounded-2xl bg-white/[0.015] border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] p-4 flex flex-col gap-1 text-xs relative overflow-hidden">
                    <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-10 bg-current pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Beneficiary Cause</span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${theme.badgeBg} ${theme.badgeText}`}>
                        {campaign.category}
                      </span>
                    </div>
                    <span className="text-white font-bold text-sm mt-1.5 leading-tight">
                      {campaign.title} 
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-light line-clamp-2">
                      {campaign.description}
                    </p>
                  </div>

                  {/* Uniswap-Style Input Card & Preset Row */}
                  <div className="space-y-3.5">
                    <div className={`rounded-2xl bg-slate-950/40 border border-white/[0.06] transition-all duration-200 p-4 space-y-2.5 ${theme.focusBorder}`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Amount to Donate</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-mono">Balance:</span>
                          <span className="font-mono text-slate-350 font-semibold">{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGC</span>
                          {walletConnected && walletBalance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomAmountStr(walletBalance.toString());
                                setModalError(null);
                              }}
                              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20 hover:border-blue-500/40 px-1.5 py-0.5 rounded font-mono uppercase cursor-pointer"
                            >
                              MAX
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={customAmountStr}
                            placeholder="0.00"
                            onChange={handleCustomChange}
                            className="bg-transparent border-0 p-0 text-3xl font-mono font-bold text-white focus:outline-none focus:ring-0 w-full placeholder-slate-700"
                          />
                        </div>
                        
                        {/* Token Badge */}
                        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-xl select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                          <div className="h-5.5 w-5.5 rounded-full bg-gradient-to-br from-yellow-450 to-amber-500 flex items-center justify-center text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" fill="none" />
                              <path d="M12 6.5v11M9.5 9h4.5a2 2 0 0 1 0 4h-4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold font-mono text-white tracking-wide">UGC</span>
                        </div>
                      </div>
                    </div>

                    {/* Preset Row */}
                    <div className="grid grid-cols-4 gap-2">
                      {presets.map((p) => {
                        const isActive = customAmountStr === p.toString();
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePresetSelect(p)}
                            className={`py-2.5 rounded-xl font-bold font-mono text-xs border transition-all cursor-pointer ${
                              isActive
                                ? theme.presetActive
                                : "bg-white/[0.01] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03] hover:border-white/[0.12]"
                            }`}
                          >
                            {p} UGC
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DeFi Transaction Invoice */}
                  <div className="rounded-2xl border border-white/[0.04] bg-[#09090f] p-4.5 space-y-3.5 shadow-inner">
                    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                      <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase">Transaction Invoice</span>
                      <span className="text-[9px] font-mono text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                        UGF-v1 Vault
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-450">
                        <span>Donation Value (Gross)</span>
                        <span className="text-white font-medium font-mono">
                          {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-455">
                        <span>Cause Allocated (96%)</span>
                        <span className="text-slate-200 font-medium font-mono">
                          {(finalAmount * 0.96).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-455">
                        <span>UGF Protocol Cut (4%)</span>
                        <span className="text-slate-350 font-medium font-mono">
                          {(finalAmount * 0.04).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-455">Gas Sponsoring</span>
                        <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9.5px] flex items-center gap-1.5 uppercase select-none">
                          <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg> 
                          Sponsored Via UGF
                        </span>
                      </div>

                      {/* Sponsor Details */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Relayer Node</span>
                        <span className="font-mono text-slate-450 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ugf-relayer.eth
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-450 border-t border-white/[0.03] pt-2.5">
                        <span>Estimated Network Fee</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-650 line-through">~0.0014 ETH (~$4.20)</span>
                          <span className="text-[9px] font-mono bg-purple-500/10 text-purple-400 px-1 rounded border border-purple-500/20 font-bold">
                            100% saved
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-350 border-t border-white/[0.03] pt-2.5">
                        <span>Final Cost to You</span>
                        <span className={`font-mono font-extrabold text-sm ${theme.textAccent}`}>
                          {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGC
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Error display */}
                  {modalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium text-center font-mono">
                      {modalError}
                    </div>
                  )}

                  {/* Interactive Button */}
                  <div className="space-y-3">
                    {!walletConnected ? (
                      <button
                        type="button"
                        onClick={onConnectWallet}
                        className="w-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600 hover:from-blue-400 hover:via-sky-400 hover:to-indigo-500 py-3.5 rounded-xl font-bold text-sm text-slate-950 cursor-pointer shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 duration-300"
                      >
                        <Wallet className="h-4.5 w-4.5 text-slate-950 fill-current" />
                        <span>Connect Wallet First</span>
                      </button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={handleInitiateDonation}
                        className={`w-full py-3.5 rounded-xl font-bold bg-gradient-to-r ${theme.buttonGrad} text-slate-950 hover:brightness-110 text-sm cursor-pointer shadow-lg transition-all duration-300 flex items-center justify-center gap-2`}
                      >
                        <svg className="h-4 w-4 fill-slate-950 animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Approve & Give (UGC Gas)</span>
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    )}

                    {/* Trust Indicator Footer */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1 select-none font-mono">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      <span>EIP-2612 Permit · Gas Relay Vault · Audited Contracts</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step B: Processing flow */}
              {step === "processing" && (
                <motion.div
                  key="processing-flow"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center space-y-7"
                >
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-white/5" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 rounded-full border border-t-blue-500 border-r-purple-500 border-b-emerald-500 border-l-transparent"
                    />

                    {step2.isActive ? (
                      <Zap className="h-6 w-6 text-purple-400 fill-purple-400/20" />
                    ) : step1.isActive && step1.icon === "signature" ? (
                      <KeyRound className="h-6 w-6 text-blue-400" />
                    ) : step1.isActive ? (
                      <ShieldCheck className="h-6 w-6 text-blue-400" />
                    ) : (
                      <Zap className="h-6 w-6 text-emerald-400 fill-emerald-400/20" />
                    )}
                  </div>

                  {/* Steps Progress Checklist */}
                  <div className="space-y-3.5 max-w-sm mx-auto">
                    {/* Phase 1 */}
                    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-xs text-left ${
                      step1.isActive
                        ? "bg-blue-500/5 border-blue-500/25 text-white font-semibold shadow-md shadow-blue-500/5"
                        : step1.isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/15 text-slate-350 font-medium"
                        : "bg-white/[0.01] border-white/5 text-slate-600"
                    }`}>
                      <div className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
                        step1.isCompleted
                          ? "bg-emerald-500/15 text-emerald-450 border border-emerald-500/25"
                          : step1.isActive
                          ? "bg-blue-650 text-white shadow-md shadow-blue-500/20 font-bold"
                          : "bg-white/5 border border-white/5 text-slate-600"
                      }`}>
                        {step1.isCompleted ? <Check className="h-3 w-3" /> : "1"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{step1.title}</p>
                          <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            step1.isCompleted
                              ? "bg-emerald-500/10 text-emerald-400"
                              : step1.isActive
                              ? "bg-blue-500/10 text-blue-400 animate-pulse"
                              : "bg-white/5 text-slate-650"
                          }`}>
                            {step1.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 font-light mt-0.5 leading-normal">
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

                    {/* Phase 2 */}
                    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-xs text-left ${
                      step2.isActive
                        ? "bg-purple-500/5 border-purple-500/25 text-white font-semibold shadow-md shadow-purple-500/5"
                        : step2.isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/15 text-slate-350 font-medium"
                        : "bg-white/[0.01] border-white/5 text-slate-600"
                    }`}>
                      <div className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
                        step2.isCompleted
                          ? "bg-emerald-500/15 text-emerald-450 border border-emerald-500/25"
                          : step2.isActive
                          ? "bg-purple-650 text-white shadow-md shadow-purple-500/20 font-bold"
                          : "bg-white/5 border border-white/5 text-slate-600"
                      }`}>
                        {step2.isCompleted ? <Check className="h-3 w-3" /> : "2"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{step2.title}</p>
                          <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            step2.isCompleted
                              ? "bg-emerald-500/10 text-emerald-400"
                              : step2.isActive
                              ? "bg-purple-500/10 text-purple-400 animate-pulse"
                              : "bg-white/5 text-slate-650"
                          }`}>
                            {step2.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-455 font-light mt-0.5 leading-normal">
                          {step2.desc}
                        </p>
                      </div>
                      {step2.isActive && (
                        <RefreshCw className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      )}
                    </div>
                  </div>

                  <p className="text-slate-500 text-[10.5px] font-mono max-w-[280px] mx-auto leading-relaxed">
                    Sponsor nodes are verifying permit signatures and executing UGF-relayed transfers on the EVM state.
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
                  className="space-y-5"
                >
                  <div className="text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-bounce">
                      <Check className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight">Donation Relayed!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Your ETH-Free gift of <span className="text-emerald-400 font-bold font-mono">${finalAmount} UGC</span> has been successfully minted on-chain.
                    </p>
                  </div>

                  {/* Receipt details block */}
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-455">
                      <span>Donation Amount (Gross)</span>
                      <span className={`font-bold font-mono ${theme.textAccent}`}>{finalAmount} UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-455">
                      <span>Cause Allocated (Net)</span>
                      <span className="text-emerald-400 font-semibold font-mono">{(finalAmount * 0.96).toFixed(2)} UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-455">
                      <span>UGF Protocol Cut (4%)</span>
                      <span className="text-slate-300 font-semibold font-mono">{(finalAmount * 0.04).toFixed(2)} UGC</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-455">
                      <span>Beneficiary Campaign</span>
                      <span className="text-white font-semibold truncate max-w-[190px]">{campaign.title}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-455">
                      <span>Network Gas Cost</span>
                      <span className="text-purple-400 font-bold font-mono flex items-center gap-1.5 uppercase text-[9.5px]">
                        <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg> 
                        0 ETH (Paid in UGC)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-2.5">
                      <span className="text-slate-500 font-mono">TX Hash Explorer</span>
                      <a
                        href={`https://sepolia.basescan.org/tx/${completionTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-450 hover:text-blue-400 font-mono text-xs flex items-center gap-0.5 group/link cursor-pointer"
                      >
                        <span className="underline underline-offset-2">
                          {completionTxHash ? `${completionTxHash.slice(0, 8)}...${completionTxHash.slice(-8)}` : ""}
                        </span>
                        <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>

                  {/* Social share widget */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-4 text-xs text-left relative overflow-hidden flex flex-col gap-2">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider text-[9px] font-mono">
                      <Twitter className="h-3.5 w-3.5 fill-current" /> Share Your Impact on Twitter / X
                    </span>
                    <p className="font-light text-slate-300 leading-relaxed italic bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                      "I just made an ETH-Free donation of {finalAmount} UGC to support the {campaign.title}! 🌳✨ Gas paid in Mock USD via UGF"
                    </p>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `I just made an ETH-Free donation of $${finalAmount} UGC to support the ${campaign.title} on @CryptoAid via the Universal Gas Facilitation protocol! 🌳✨`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex self-start items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-3.5 py-1.5 transition-colors text-xs font-sans cursor-pointer mt-1"
                    >
                      <span>Share on X</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Footer Complete CTA */}
                  <button
                    onClick={handleClose}
                    className="w-full bg-white text-slate-950 hover:bg-slate-100 py-3 rounded-xl font-bold text-sm transition-colors text-center block cursor-pointer shadow-md shadow-black/20"
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
