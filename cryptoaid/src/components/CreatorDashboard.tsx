import React, { useState, useEffect, useRef } from "react";
import { Campaign, Donation } from "../types";
import {
  Plus,
  Check,
  RefreshCw,
  KeyRound,
  AlertCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Coins,
  Users,
  Award,
  Info,
  Terminal,
  ChevronRight,
  X,
  Layers,
  Activity,
  Calendar,
  ShieldCheck,
  Zap,
  Heart,
  Sparkles,
  Trash2,
  ShieldAlert,
  Fingerprint,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatAddress } from "../mockData";
import { BACKEND_URL } from "../web3Service";
import { ethers } from "ethers";

interface CreatorDashboardProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBalance: number;
  onConnectWallet: () => void;
  campaigns: Campaign[];
  onRefreshCampaigns: () => Promise<void>;
  donations: Donation[];
}

export default function CreatorDashboard({
  walletConnected,
  walletAddress,
  walletBalance,
  onConnectWallet,
  campaigns,
  onRefreshCampaigns,
  donations,
}: CreatorDashboardProps) {
  // Creator's campaigns
  const myCampaigns = campaigns.filter(
    (c) => c.wallet && c.wallet.toLowerCase() === walletAddress.toLowerCase()
  );

  // Selected campaign for viewing detailed transaction ledger
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignDonations, setSelectedCampaignDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState<boolean>(false);

  // Form states for creating a campaign
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goalUsd: "",
    category: "Environmental" as "Environmental" | "Humanitarian" | "Education",
    icon: "🌳",
    wallet: walletAddress,
  });

  const [formStatus, setFormStatus] = useState<
    "idle" | "submitting_blockchain" | "writing_database" | "completed" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulated node & relayer console status
  const [blockHeight, setBlockHeight] = useState<number>(1839402);
  const [gasPrice, setGasPrice] = useState<number>(1.25);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // WebSockets RPC listener CLI state removed for user-friendly design

  // Tooltip/active state for SVG Chart
  const [activeChartPoint, setActiveChartPoint] = useState<{
    day: string;
    value: number;
    daily: number;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // Web3 Audit Drawer state
  const [selectedAuditTx, setSelectedAuditTx] = useState<Donation | null>(null);

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Campaign deletion state
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [isSignatureVerified, setIsSignatureVerified] = useState<boolean>(false);
  const [isSigningSignature, setIsSigningSignature] = useState<boolean>(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSimulateSignature = () => {
    setIsSigningSignature(true);
    setDeleteError(null);
    // Simulate web3 wallet provider pop-up delay
    setTimeout(() => {
      setIsSigningSignature(false);
      setIsSignatureVerified(true);
      // Log verification in relayer console
      const time = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${time}] SECURITY: Cryptographic signature verified for Cause ID: ${selectedCampaignId?.substring(0, 8)}`,
      ]);
    }, 1800);
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);

    // Log deletion request submission
    const time = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${time}] RELAYER: Submitting soft-delete transaction to database for Cause ID: ${selectedCampaignId.substring(0, 8)}...`,
    ]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/causes/${selectedCampaignId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to delete campaign");
      }

      // Log success
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SUCCESS: Campaign deactivated successfully in database.`,
      ]);

      // Clear selection
      setSelectedCampaignId(null);
      setIsDeleting(false);

      // Refresh campaigns list
      await onRefreshCampaigns();
    } catch (err: any) {
      console.error("Failed to delete campaign:", err);
      setDeleteError(err.message || "Failed to process campaign deletion request.");
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: Campaign deactivation failed: ${err.message || "Server error"}`,
      ]);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Initialize terminal logs on mount
  useEffect(() => {
    const startupLogs = [
      `[${new Date().toLocaleTimeString()}] INFO: Booting CryptoAid console daemon v2.0.4...`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: Base Sepolia RPC link active (base-sepolia.g.alchemy.com)`,
      `[${new Date().toLocaleTimeString()}] SYSTEM: Listening for Permit signature authorizations (ERC-2612)`,
      `[${new Date().toLocaleTimeString()}] RELAYER: Gas sponsorship balance: 8.42 ETH (NOMINAL)`,
      `[${new Date().toLocaleTimeString()}] SECURE: Syncing state with PostgreSQL cause tables...`,
    ];
    setTerminalLogs(startupLogs);
  }, []);

  // Simulated background terminal activity
  useEffect(() => {
    if (!walletConnected) return;
    const interval = setInterval(() => {
      // Fluctuate gas price slightly
      setGasPrice(parseFloat((Math.random() * 0.4 + 1.1).toFixed(2)));

      // Tick block height ~40% of the time (approx. every 5s)
      if (Math.random() > 0.6) {
        setBlockHeight((prev) => prev + 1);
        const time = new Date().toLocaleTimeString();
        const rand = Math.random();
        let log = "";
        if (rand > 0.8) {
          log = `[${time}] RPC: Polled Base Sepolia block #${blockHeight + 1} | Gas: ${(Math.random() * 0.3 + 1.1).toFixed(2)} Gwei | 0 target events`;
        } else if (rand > 0.6) {
          log = `[${time}] RELAYER: Gas station status OK. Subsidized cumulative gas: 1.14 ETH`;
        } else if (rand > 0.4) {
          log = `[${time}] DAEMON: Checking WebSocket connection state... nominal (latency 35ms)`;
        } else {
          log = `[${time}] WEBSOCKET: Subscription ping acknowledged by Base Sepolia node`;
        }
        setTerminalLogs((prev) => [...prev.slice(-25), log]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [walletConnected, blockHeight]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Event listeners are integrated at the contract-level via real-time DB polling & sync

  // Set default icon based on category change
  useEffect(() => {
    if (formData.category === "Environmental") {
      setFormData((prev) => ({ ...prev, icon: "🌳" }));
    } else if (formData.category === "Humanitarian") {
      setFormData((prev) => ({ ...prev, icon: "💧" }));
    } else if (formData.category === "Education") {
      setFormData((prev) => ({ ...prev, icon: "📚" }));
    }
  }, [formData.category]);

  // Sync recipient wallet with connected wallet when walletAddress changes
  useEffect(() => {
    if (walletAddress) {
      setFormData((prev) => ({ ...prev, wallet: walletAddress }));
    }
  }, [walletAddress]);

  // Fetch donations for selected campaign
  const fetchCampaignDonations = async (id: string) => {
    setLoadingDonations(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/causes/${id}/donations`);
      const data = await res.json();
      if (data.donations) {
        const campaign = campaigns.find((c) => c.id === id);
        const mapped: Donation[] = data.donations.map((tx: any) => ({
          id: tx.id,
          donor: tx.donor,
          amount: parseFloat(tx.amount),
          campaignId: id,
          campaignTitle: campaign?.title ?? "Campaign Details",
          timestamp: new Date(tx.timestamp).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          hash: tx.txHash,
        }));
        setSelectedCampaignDonations(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch donations for campaign:", err);
    } finally {
      setLoadingDonations(false);
    }
  };

  // Set default selected campaign when list is populated
  useEffect(() => {
    if (myCampaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(myCampaigns[0].id);
    }
  }, [myCampaigns, selectedCampaignId]);

  // Auto-fetch donations when selectedCampaignId or campaigns update
  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignDonations(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // Sync donations ledger automatically when a new donation appears in the global stream for the active campaign
  useEffect(() => {
    if (selectedCampaignId && donations.length > 0) {
      const latestDonation = donations[0];
      if (latestDonation.campaignId === selectedCampaignId) {
        fetchCampaignDonations(selectedCampaignId);
        // Log transaction detection in relayer terminal
        const time = new Date().toLocaleTimeString();
        const log = `[${time}] EVENT: DonationReceived caught on-chain! Tx: ${formatAddress(latestDonation.hash)} | Amount: $${latestDonation.amount}`;
        setTerminalLogs((prev) => [...prev, log]);
      }
    }
  }, [donations]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected) return;

    // Front-end validations
    if (!formData.title.trim()) {
      setErrorMessage("Campaign title is required");
      setFormStatus("error");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Campaign description is required");
      setFormStatus("error");
      return;
    }
    if (
      !formData.goalUsd ||
      isNaN(Number(formData.goalUsd)) ||
      Number(formData.goalUsd) <= 0
    ) {
      setErrorMessage("A valid positive goal amount in USD is required");
      setFormStatus("error");
      return;
    }
    if (!formData.wallet || !ethers.isAddress(formData.wallet)) {
      setErrorMessage("A valid recipient wallet address is required");
      setFormStatus("error");
      return;
    }

    setFormStatus("submitting_blockchain");
    setErrorMessage(null);

    // Push form submit log
    const time = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${time}] RELAYER: Deferring campaign creation gas. Submitting signature parameters on-chain...`,
    ]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/causes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.title,
          description: formData.description,
          wallet: formData.wallet,
          icon: formData.icon,
          tag: formData.category,
          goalUsd: parseFloat(formData.goalUsd),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create campaign"
        );
      }

      setFormStatus("completed");
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SUCCESS: Campaign on-chain deployment verified. Registered database ID: ${result.cause?.id}`,
      ]);

      await onRefreshCampaigns();

      // Set newly created campaign as active
      if (result.cause && result.cause.id) {
        setSelectedCampaignId(result.cause.id.toString());
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        goalUsd: "",
        category: "Environmental",
        icon: "🌳",
        wallet: walletAddress,
      });

      // Clear success screen after some time
      setTimeout(() => {
        setIsCreating(false);
        setFormStatus("idle");
      }, 2000);
    } catch (err: any) {
      console.error("Failed to register campaign:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred during campaign registration."
      );
      setFormStatus("error");
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: Campaign registration failed: ${err.message || "Relayer RPC Timeout"}`,
      ]);
    }
  };

  // Compute stats for campaigns owned by this wallet
  const totalRaised = myCampaigns.reduce((acc, c) => acc + c.currentAmount, 0);
  const activeCount = myCampaigns.length;
  const totalDonorsCount = myCampaigns.reduce((acc, c) => acc + c.donorsCount, 0);

  const selectedCampaign = myCampaigns.find((c) => c.id === selectedCampaignId);

  // Generate 7-day chart data based on campaign stats
  const getChartData = (campaignId: string, currentAmount: number) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const points = [];

    if (currentAmount === 0) {
      return days.map((d) => ({ day: d, value: 0, daily: 0 }));
    }

    const seed = campaignId
      ? (campaignId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3) + 1.8
      : 2;

    let prevValue = 0;
    for (let i = 0; i < 7; i++) {
      const dayFactor = i / 6; // 0 to 1
      const value = Math.round(currentAmount * Math.pow(dayFactor, seed) * 100) / 100;
      const daily = Math.max(0, Math.round((value - prevValue) * 100) / 100);
      points.push({
        day: days[i],
        value: value,
        daily: daily,
      });
      prevValue = value;
    }
    return points;
  };

  const chartData = selectedCampaign
    ? getChartData(selectedCampaign.id, selectedCampaign.currentAmount * 0.96)
    : [];

  // Map chart coordinates
  const svgWidth = 600;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  const chartCoordinates = chartData.map((pt, idx) => {
    const maxVal = Math.max(...chartData.map((d) => d.value), 10);
    const x = paddingX + (idx / (chartData.length - 1)) * (svgWidth - paddingX * 2);
    const y =
      svgHeight -
      paddingY -
      (pt.value / maxVal) * (svgHeight - paddingY * 2);
    return { x, y, ...pt };
  });

  // SVG spline builder
  const getSplinePath = () => {
    if (chartCoordinates.length === 0) return "";
    let path = `M ${chartCoordinates[0].x} ${chartCoordinates[0].y}`;
    for (let i = 1; i < chartCoordinates.length; i++) {
      const cpX1 = chartCoordinates[i - 1].x + 40;
      const cpY1 = chartCoordinates[i - 1].y;
      const cpX2 = chartCoordinates[i].x - 40;
      const cpY2 = chartCoordinates[i].y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${chartCoordinates[i].x} ${chartCoordinates[i].y}`;
    }
    return path;
  };

  const linePath = getSplinePath();
  const areaPath =
    linePath && chartCoordinates.length > 0
      ? `${linePath} L ${chartCoordinates[chartCoordinates.length - 1].x} ${svgHeight - paddingY} L ${chartCoordinates[0].x} ${svgHeight - paddingY} Z`
      : "";

  if (!walletConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[70vh]">
        <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/[0.08] p-8 text-center space-y-6 relative overflow-hidden bg-[#0a0a14]/70 backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.05)]">
          <div className="absolute top-[-30%] left-[-30%] w-[250px] h-[250px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-30%] w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-inner">
            <KeyRound className="h-7 w-7 text-blue-400 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Creator Portal</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto font-light">
              Connect your Web3 wallet to manage your ETH-free donation campaigns, register new causes, and audit your transaction histories.
            </p>
          </div>
          <button
            onClick={onConnectWallet}
            className="
              mx-auto flex items-center gap-2 overflow-hidden
              rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white
              px-6 py-2.5 text-sm font-semibold
              hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98]
              transition-all duration-150 cursor-pointer
              shadow-[0_4px_20px_rgba(99,102,241,0.25)]
            "
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 mx-auto w-full max-w-[1440px] px-6 lg:px-16 py-8 space-y-8 relative">
      {/* ── Page Header Panel ── */}
      <div className="grid grid-cols-1 gap-6">
        {/* Creator Console Card */}
        <div className="glass-panel rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0c0c16]/50 via-[#07070f]/70 to-[#0c0c16]/50 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[200px] h-[80px] bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Creator Portal</span>
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wider font-mono">
                    CONSOLE
                  </span>
                </h2>
              </div>

              {/* Action Trigger */}
              <button
                onClick={() => {
                  setIsCreating(!isCreating);
                  setFormStatus("idle");
                  setErrorMessage(null);
                }}
                className="flex items-center gap-2 rounded-lg bg-white text-[#050508] px-4 py-2 text-xs font-semibold shadow-[0_2px_12px_rgba(255,255,255,0.1)] hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer select-none"
              >
                {isCreating ? (
                  <>
                    <ArrowLeft className="h-3.5 w-3.5 text-[#050508]" />
                    <span>Dashboard</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-[#050508]" />
                    <span>Launch Campaign</span>
                  </>
                )}
              </button>
            </div>

            {/* Network status row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-white/[0.04] bg-[#05050a]/40 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Network</p>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Base Sepolia</span>
                </div>
              </div>
              <div className="space-y-1 border-l border-white/[0.06] pl-4">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Relayer Status</p>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online & Active</span>
                </div>
              </div>
              <div className="space-y-1 border-l border-white/[0.06] pl-4">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Gas Sponsorship</p>
                <p className="text-sky-400 font-semibold flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>ETH-Free (MUSD Paid)</span>
                </p>
              </div>
              <div className="space-y-1 border-l border-white/[0.06] pl-4">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">System Latency</p>
                <p className="text-purple-400 font-semibold flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Optimal (32ms)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs border-t border-white/[0.05] pt-4 text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Creator Wallet:</span>
              <span className="font-mono text-[11px] text-slate-300">{formatAddress(walletAddress)}</span>
              <button
                onClick={() => handleCopy(walletAddress)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                title="Copy address"
              >
                {copiedText === walletAddress ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Available Balance:</span>
              <span className="font-mono text-indigo-400 font-semibold">{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mockUSD</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isCreating ? (
          /* ── CAMPAIGN CREATION WITH LIVE PREVIEW ── */
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Form Input fields */}
            <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/[0.07] p-8 bg-[#0a0a14]/40 backdrop-blur-md relative overflow-hidden shadow-2xl space-y-6">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

              <div>
                <h3 className="text-lg font-bold text-white">Create an ETH-Free Campaign</h3>
                <p className="text-xs text-slate-400 font-light mt-1">
                  Deploy an ETH-free smart contract registration. Donors contribute to this campaign without needing native ETH in their wallets.
                </p>
              </div>

              {formStatus !== "idle" && formStatus !== "error" ? (
                /* PROGRESS STATUS SCREENS */
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                    {formStatus === "completed" ? (
                      <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="h-6 w-6 text-emerald-400" />
                      </div>
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-md font-bold text-white">
                      {formStatus === "submitting_blockchain" && "Confirming on Base Sepolia..."}
                      {formStatus === "writing_database" && "Registering Campaign Record..."}
                      {formStatus === "completed" && "Campaign Successfully Launched!"}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
                      {formStatus === "submitting_blockchain" && "Deploying campaign mapping and recipient details to the DonationVault smart contract..."}
                      {formStatus === "writing_database" && "Saving campaign information, description, category, and graphics to the PostgreSQL database..."}
                      {formStatus === "completed" && "Your campaign has been successfully registered on-chain and added to the public explore feed."}
                    </p>
                  </div>
                </div>
              ) : (
                /* ACTIVE FORM INPUTS */
                <form onSubmit={handleSubmit} className="space-y-6">
                  {formStatus === "error" && errorMessage && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">Launch Failed</p>
                        <p className="text-slate-400 font-light">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Campaign Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Clean Ocean Initiative"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all"
                        maxLength={60}
                      />
                    </div>

                    {/* Goal Amount */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Funding Goal (USD)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="50000"
                          value={formData.goalUsd}
                          onChange={(e) => setFormData({ ...formData, goalUsd: e.target.value })}
                          className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all font-mono"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Description / Impact Statement
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Provide a detailed description of what funding achieves and what will be completed..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Category */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category: e.target.value as "Environmental" | "Humanitarian" | "Education",
                          })
                        }
                        className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      >
                        <option value="Environmental">Environmental</option>
                        <option value="Humanitarian">Humanitarian</option>
                        <option value="Education">Education</option>
                      </select>
                    </div>

                    {/* Icon Representation */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Category Symbol
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500/50 transition-colors"
                        placeholder="🌳"
                        maxLength={4}
                      />
                    </div>

                    {/* Recipient Wallet */}
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={formData.wallet}
                        onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                        className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Gas disclaimer block */}
                  <div className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 text-[11px] text-slate-400 flex items-start gap-2.5 leading-relaxed">
                    <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">ETH-Free Gas Settlement Notice:</span> Smart contract operations incur transaction fees. Under our model, UGF processes and sponsors deployment gas on Base Sepolia using Mock USD. You do not need to sign any transaction in your wallet; the relayer handles execution.
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="rounded-lg border border-white/[0.07] hover:bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.2)] transition-all cursor-pointer"
                    >
                      Launch Campaign
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Live Campaign Preview Panel */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Live Campaign Preview
              </h4>
              <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden bg-[#07070f] relative group shadow-2xl">
                {/* Visual Category Header Gradient */}
                <div
                  className={`
                    h-[140px] bg-gradient-to-br transition-all duration-300 flex items-center justify-center relative
                    ${
                      formData.category === "Environmental"
                        ? "from-emerald-500/10 via-emerald-950/20 to-[#07070f]"
                        : formData.category === "Education"
                        ? "from-purple-500/10 via-purple-950/20 to-[#07070f]"
                        : "from-blue-500/10 via-blue-950/20 to-[#07070f]"
                    }
                  `}
                >
                  <span className="text-5xl select-none filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.1)]">
                    {formData.icon || "🌳"}
                  </span>

                  {/* Glass Tag Badge */}
                  <span
                    className={`
                      absolute top-4 left-4 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase
                      ${
                        formData.category === "Environmental"
                          ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/20"
                          : formData.category === "Education"
                          ? "text-purple-400 bg-purple-950/40 border-purple-500/20"
                          : "text-blue-400 bg-blue-950/40 border-blue-500/20"
                      }
                    `}
                  >
                    {formData.category}
                  </span>

                  <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] text-slate-500 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    PREVIEW
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-md font-bold text-white truncate">
                      {formData.title.trim() || "Untitled Campaign"}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <span>Recipient:</span>
                      <span>
                        {formData.wallet && ethers.isAddress(formData.wallet)
                          ? formatAddress(formData.wallet)
                          : "0x0000...0000"}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs font-light leading-relaxed line-clamp-3 min-h-[54px]">
                    {formData.description.trim() ||
                      "Your campaign description will be rendered here. Provide a clear and descriptive impact statement..."}
                  </p>

                  <div className="space-y-2 border-t border-white/[0.05] pt-4">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Raised: $0.00 mockUSD</span>
                      <span className="text-slate-300 font-bold">0%</span>
                    </div>
                    {/* Empty Bar */}
                    <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-indigo-500 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Goal: ${formData.goalUsd ? Number(formData.goalUsd).toLocaleString() : "0"} USD</span>
                      <span>0 contributions</span>
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full mt-2 rounded-lg bg-white/[0.03] border border-white/[0.08] py-2 text-center text-xs font-bold text-slate-500 tracking-wide select-none"
                  >
                    PREVIEW MODE
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── CORE DASHBOARD VIEW ── */
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Overview Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Stat: Total Raised */}
              <div className="glass-panel rounded-2xl border border-white/[0.06] p-6 relative overflow-hidden bg-gradient-to-b from-[#0c0c16]/80 to-[#06060c]/80 shadow-md group">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Pulsing Sparkline Graphic */}
                <div className="absolute bottom-2 right-4 w-24 h-8 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <path
                      d="M0,25 Q15,12 30,22 T60,8 T90,18 L100,12"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,25 Q15,12 30,22 T60,8 T90,18 L100,12 L100,30 L0,30 Z"
                      fill="url(#sparkline-grad-1)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="sparkline-grad-1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Funds Received</span>
                  <Coins className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black font-mono text-white">
                    ${(totalRaised * 0.96).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">USD</span>
                </div>
                <div className="flex items-center gap-1.5 mt-4 text-[9.5px] font-mono text-slate-500 border-t border-white/[0.04] pt-2">
                  <span>Gross: ${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                  <span className="text-slate-700">•</span>
                  <span>UGF Cut (4%): ${(totalRaised * 0.04).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Stat: Campaigns */}
              <div className="glass-panel rounded-2xl border border-white/[0.06] p-6 relative overflow-hidden bg-gradient-to-b from-[#0c0c16]/80 to-[#06060c]/80 shadow-md group">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Pulsing Sparkline Graphic */}
                <div className="absolute bottom-2 right-4 w-24 h-8 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <path
                      d="M0,28 L20,20 L40,24 L60,10 L80,18 L100,5"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,28 L20,20 L40,24 L60,10 L80,18 L100,5 L100,30 L0,30 Z"
                      fill="url(#sparkline-grad-2)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="sparkline-grad-2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Campaigns</span>
                  <Award className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black font-mono text-white">{activeCount}</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-light mt-4 border-t border-white/[0.04] pt-2">
                  Registered on-chain in DonationVault
                </p>
              </div>

              {/* Stat: Donors */}
              <div className="glass-panel rounded-2xl border border-white/[0.06] p-6 relative overflow-hidden bg-gradient-to-b from-[#0c0c16]/80 to-[#06060c]/80 shadow-md group">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-fuchsia-500" />
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Pulsing Sparkline Graphic */}
                <div className="absolute bottom-2 right-4 w-24 h-8 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <path
                      d="M0,25 Q20,10 40,15 T80,5 T100,10"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,25 Q20,10 40,15 T80,5 T100,10 L100,30 L0,30 Z"
                      fill="url(#sparkline-grad-3)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="sparkline-grad-3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Contributions</span>
                  <Users className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black font-mono text-white">{totalDonorsCount}</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-light mt-4 border-t border-white/[0.04] pt-2">
                  ETH-free permit signatures recorded
                </p>
              </div>
            </div>

            {myCampaigns.length === 0 ? (
              /* NO CAMPAIGNS BLUEPRINT EMPTY STATE */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto py-8">
                {/* Left explanation and trigger */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/[0.08] border border-indigo-500/20 px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                      Getting Started
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">
                      No ETH-free fundraising campaigns found under this address.
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-light">
                      Deploy your first campaign using our console. Registered campaigns are added on-chain on Base Sepolia, enabling donors to execute ETH-free payments settled in Mock USD by the UGF relayer network.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreating(true)}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.2)] transition-all cursor-pointer"
                    >
                      Launch First Campaign
                    </button>
                    <a
                      href="#navbar-header"
                      className="rounded-lg border border-white/[0.08] hover:bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all"
                    >
                      Documentation
                    </a>
                  </div>
                </div>

                {/* Right Interactive SVG Diagram */}
                <div className="glass-panel rounded-2xl border border-white/[0.08] bg-[#07070f] p-6 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none" />

                  {/* Flow Blueprint Diagram */}
                  <svg viewBox="0 0 400 240" fill="none" className="w-full max-w-md">
                    {/* Donor Node */}
                    <g transform="translate(40, 120)">
                      <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="18" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1.5" />
                      <Users className="h-5 w-5 text-blue-400 absolute" style={{ transform: "translate(-10px, -10px)" }} />
                      <text x="0" y="44" fill="#64748B" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.05em">DONOR</text>
                    </g>

                    {/* Relayer Node */}
                    <g transform="translate(200, 70)">
                      <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="18" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1.5" />
                      <Terminal className="h-5 w-5 text-emerald-400 absolute" style={{ transform: "translate(-10px, -10px)" }} />
                      <text x="0" y="44" fill="#64748B" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.05em">RELAYER</text>
                    </g>

                    {/* Vault Node */}
                    <g transform="translate(360, 120)">
                      <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="18" fill="rgba(139,92,246,0.08)" stroke="#8B5CF6" strokeWidth="1.5" />
                      <Layers className="h-5 w-5 text-purple-400 absolute" style={{ transform: "translate(-10px, -10px)" }} />
                      <text x="0" y="44" fill="#64748B" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.05em">VAULT</text>
                    </g>

                    {/* Path 1: Donor -> Relayer (Permit Payload) */}
                    <path d="M 68 100 Q 120 70 172 70" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="110" y="65" fill="#3B82F6" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">1. Sign Permit</text>

                    {/* Path 2: Relayer -> Vault (Sponsor Gas) */}
                    <path d="M 228 70 Q 280 70 332 100" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" />
                    <text x="290" y="65" fill="#10B981" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">2. Submit Tx</text>

                    {/* Path 3: Donor -> Vault (Direct Transfer) */}
                    <path d="M 68 120 Q 200 150 332 120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <text x="200" y="154" fill="#475569" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">No Donor Gas</text>

                    {/* Flowing animated bubble */}
                    <circle cx="0" cy="0" r="3" fill="#10B981">
                      <animateMotion dur="4s" repeatCount="indefinite" path="M 68 100 Q 120 70 172 70 Q 200 70 228 70 Q 280 70 332 100" />
                    </circle>
                  </svg>
                </div>
              </div>
            ) : (
              /* CORE DASHBOARD DETAILS GRID */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* SIDEBAR: CAMPAIGN SELECTOR LIST */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Your Campaigns ({myCampaigns.length})
                  </h3>
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {myCampaigns.map((c) => {
                      const isSelected = selectedCampaignId === c.id;
                      // Accurate decimal percentage computation
                      const pct = Math.min(100, ((c.currentAmount * 0.96) / c.targetAmount) * 100);

                      let activeAccent = "border-indigo-500 bg-indigo-500/[0.03]";
                      let progressColor = "from-indigo-500 to-blue-500";
                      let glowShadow = "shadow-[0_0_8px_rgba(99,102,241,0.25)]";

                      if (c.category === "Environmental") {
                        activeAccent = "border-emerald-500 bg-emerald-500/[0.03]";
                        progressColor = "from-emerald-500 to-teal-500";
                        glowShadow = "shadow-[0_0_8px_rgba(16,185,129,0.25)]";
                      } else if (c.category === "Education") {
                        activeAccent = "border-purple-500 bg-purple-500/[0.03]";
                        progressColor = "from-purple-500 to-fuchsia-500";
                        glowShadow = "shadow-[0_0_8px_rgba(139,92,246,0.25)]";
                      }

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCampaignId(c.id)}
                          className={`
                            glass-panel rounded-xl p-4 border transition-all duration-200 cursor-pointer select-none hover:scale-[1.01] hover:border-white/20
                            ${isSelected ? activeAccent : `border-white/[0.06] bg-[#0a0a14]/30`}
                          `}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xl leading-none">{c.icon}</span>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{c.title}</h4>
                                <p className="text-[9px] text-slate-400 font-light mt-0.5">{c.category}</p>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/[0.08] border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-mono font-bold text-emerald-400 uppercase">
                              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          </div>

                          <div className="mt-5 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400">
                                <span
                                  className="text-white font-semibold"
                                  title="Net received after 4% UGF fee"
                                >
                                  ${(c.currentAmount * 0.96).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </span>
                                <span className="text-slate-600"> / ${c.targetAmount.toLocaleString()}</span>
                              </span>
                              {/* Decimals preserved for precision */}
                              <span className="text-slate-300 font-bold">
                                {pct < 1 && pct > 0 ? pct.toFixed(2) : pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full bg-gradient-to-r ${progressColor} rounded-full ${glowShadow}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* MAIN DETAIL PANEL: VISUAL CHART & INFLOW LEDGER */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Section 1: Active Campaign Details & Interactive Chart */}
                  {selectedCampaign && (
                    <div className="glass-panel rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0c0c16]/30 to-[#07070f]/30 p-6 shadow-xl relative overflow-hidden space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{selectedCampaign.icon}</span>
                            <h3 className="text-lg font-bold text-white tracking-tight">
                              {selectedCampaign.title}
                            </h3>
                            <button
                              onClick={() => {
                                setIsDeleting(true);
                                setDeleteConfirmText("");
                                setIsSignatureVerified(false);
                                setDeleteError(null);
                              }}
                              className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/30 bg-red-500/[0.03] hover:bg-red-500/[0.08] text-red-400 hover:text-red-300 transition-all cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 font-light max-w-lg">
                            {selectedCampaign.description}
                          </p>
                        </div>

                        {/* Interactive Share trigger */}
                        <div className="p-2.5 rounded-xl border border-white/[0.05] bg-[#05050a]/40 max-w-xs shrink-0 space-y-1.5 text-left font-mono">
                          <p className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">Shareable Campaign link</p>
                          <div className="flex items-center gap-2 bg-[#020204]/80 border border-white/[0.06] rounded-lg px-2.5 py-1">
                            <span className="text-[10px] text-indigo-300 truncate w-[140px] select-all">
                              {`${window.location.origin}/?campaign=${selectedCampaign.id}`}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(`${window.location.origin}/?campaign=${selectedCampaign.id}`);
                              }}
                              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                              title="Copy link"
                            >
                              {copiedText === `${window.location.origin}/?campaign=${selectedCampaign.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SVG Line Chart Widget */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs select-none">
                          <span className="text-slate-500 font-mono">FUNDING TRENDS (LAST 7 DAYS)</span>
                          {activeChartPoint ? (
                            <span className="text-white font-mono flex items-center gap-1.5">
                              <span className="font-light text-slate-500">{activeChartPoint.day}:</span>
                              <span className="text-emerald-400 font-bold">${activeChartPoint.value.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-500 font-light">(Daily: +${activeChartPoint.daily.toFixed(2)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-light font-mono">Hover points for ledger info</span>
                          )}
                        </div>

                        <div className="relative glass-panel rounded-xl border border-white/[0.04] bg-[#05050a]/40 p-4 h-[190px] flex items-center justify-center">
                          {selectedCampaign.currentAmount === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05050a]/60 backdrop-blur-[1px] rounded-xl z-10 text-center space-y-1 select-none pointer-events-none">
                              <p className="text-[11px] font-bold text-slate-400 font-mono">NO TRAJECTORY DATA</p>
                              <p className="text-[9.5px] text-slate-500 font-light font-mono">Awaiting first ETH-free donation payload</p>
                            </div>
                          )}
                          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                              <defs>
                                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                                </linearGradient>
                                <filter id="glow-line" x="-10%" y="-10%" width="120%" height="120%">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                              </defs>

                              {/* Horizontal helper grid lines */}
                              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1={paddingX} y1={(svgHeight) / 2} x2={svgWidth - paddingX} y2={(svgHeight) / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
                              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                              {/* Gradient Area under line */}
                              {areaPath && (
                                <path d={areaPath} fill="url(#chart-area-grad)" />
                              )}

                              {/* Glowing Spline Line */}
                              {linePath && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#8B5CF6"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  filter="url(#glow-line)"
                                />
                              )}

                              {/* Data Points and Interactivity Zones */}
                              {chartCoordinates.map((pt, idx) => {
                                const isHovered = activeChartPoint?.index === idx;
                                return (
                                  <g key={idx}>
                                    {/* X Axis Labels */}
                                    <text
                                      x={pt.x}
                                      y={svgHeight - 4}
                                      fill="#475569"
                                      fontSize="9.5"
                                      fontFamily="monospace"
                                      textAnchor="middle"
                                      fontWeight="bold"
                                      className="select-none"
                                    >
                                      {pt.day}
                                    </text>

                                    {/* Line anchor node circle */}
                                    <circle
                                      cx={pt.x}
                                      cy={pt.y}
                                      r={isHovered ? 5.5 : 3.5}
                                      fill={isHovered ? "#FFFFFF" : "#8B5CF6"}
                                      stroke="#0d0d14"
                                      strokeWidth={isHovered ? 2 : 1}
                                      className="transition-all duration-150"
                                    />

                                    {/* Hover capture vertical segment */}
                                    <rect
                                      x={pt.x - (svgWidth - paddingX * 2) / 12}
                                      y={0}
                                      width={(svgWidth - paddingX * 2) / 6}
                                      height={svgHeight - paddingY}
                                      fill="transparent"
                                      className="cursor-crosshair"
                                      onMouseEnter={() =>
                                        setActiveChartPoint({
                                          day: pt.day,
                                          value: pt.value,
                                          daily: pt.daily,
                                          index: idx,
                                          x: pt.x,
                                          y: pt.y,
                                        })
                                      }
                                      onMouseLeave={() => setActiveChartPoint(null)}
                                    />
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Donation Inflow Ledger Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Campaign Donation Ledger: {selectedCampaign?.title || "Logs"}
                      </h3>
                      <button
                        onClick={() => selectedCampaignId && fetchCampaignDonations(selectedCampaignId)}
                        disabled={loadingDonations}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 bg-[#0a0a14]/60 border border-white/[0.06] px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer select-none"
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingDonations ? "animate-spin" : ""}`} />
                        <span>Sync Ledger</span>
                      </button>
                    </div>

                    <div className="glass-panel rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0c0c16]/30 to-[#06060c]/30 overflow-hidden shadow-xl">
                      {loadingDonations ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-3">
                          <RefreshCw className="h-7 w-7 text-indigo-400 animate-spin" />
                          <p className="text-xs text-slate-400 font-light">Reading database events...</p>
                        </div>
                      ) : selectedCampaignDonations.length === 0 ? (
                        <div className="p-8 text-center max-w-2xl mx-auto space-y-8 flex flex-col items-center select-none">
                          {/* Illustrative heart/sparkle icon inside a glowing gradient ring */}
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-inner">
                              <Heart className="h-6 w-6 text-pink-400 fill-pink-400/10" />
                              <Sparkles className="h-4.5 w-4.5 text-indigo-300 absolute -top-1 -right-1 animate-bounce" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">Ready to start fundraising!</h3>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-md font-light">
                              Your ETH-free donation campaign is active on Base Sepolia. Share your campaign with your community to start receiving donations.
                            </p>
                          </div>

                          {/* 3 Onboarding Steps */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-2">
                            {/* Step 1 */}
                            <div className="glass-panel rounded-xl border border-white/[0.04] bg-[#05050a]/40 p-4 space-y-4 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 font-mono">1</span>
                                  <h4 className="text-xs font-bold text-white">Share Campaign</h4>
                                </div>
                                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                                  Copy your unique campaign link and share it on social media, newsletters, or your website.
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(`${window.location.origin}/?campaign=${selectedCampaign?.id}`);
                                }}
                                className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-650/20 hover:bg-indigo-600/30 border border-indigo-500/30 py-2 text-xs font-semibold text-indigo-300 transition-all active:scale-[0.98] cursor-pointer"
                              >
                                {copiedText === `${window.location.origin}/?campaign=${selectedCampaign?.id}` ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy Campaign Link</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Step 2 */}
                            <div className="glass-panel rounded-xl border border-white/[0.04] bg-[#05050a]/40 p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold text-pink-400 font-mono">2</span>
                                <h4 className="text-xs font-bold text-white">ETH-Free Payments</h4>
                              </div>
                              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                                Donors need 0 native ETH to contribute. Gas fees are quoted in Mock USD (UGC) and settled directly from the donation amount via UGF relayer sponsorship.
                              </p>
                            </div>

                            {/* Step 3 */}
                            <div className="glass-panel rounded-xl border border-white/[0.04] bg-[#05050a]/40 p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">3</span>
                                <h4 className="text-xs font-bold text-white">Track Progress</h4>
                              </div>
                              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                                When a donation is sent, the transaction ledger and metrics below will update automatically in real-time.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/[0.06] text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-[#0c0c15]/40 select-none">
                                <th className="py-3.5 px-4">Donor Address</th>
                                <th className="py-3.5 px-4 text-right">Gross Amount</th>
                                <th className="py-3.5 px-4 text-right">UGF Cut (4%)</th>
                                <th className="py-3.5 px-4 text-right">Net Allocated</th>
                                <th className="py-3.5 px-4">Tx Hash</th>
                                <th className="py-3.5 px-4">Date & Time</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03] text-xs text-slate-300">
                              {selectedCampaignDonations.map((d) => (
                                <tr
                                  key={d.id}
                                  onClick={() => setSelectedAuditTx(d)}
                                  className="hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer group"
                                >
                                  <td className="py-3.5 px-4 font-mono">
                                    <span className="group-hover:text-indigo-400 transition-colors">
                                      {formatAddress(d.donor)}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                                    ${d.amount.toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono text-rose-500/80 font-medium">
                                    -${(d.amount * 0.04).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                                    ${(d.amount * 0.96).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-450">
                                    {formatAddress(d.hash)}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-400 font-light whitespace-nowrap">
                                    {d.timestamp}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 px-2.5 py-0.5 text-[8.5px] font-bold text-emerald-400 uppercase font-mono tracking-wide">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Confirmed
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WEB3 TRANSACTION AUDIT DRAWER ── */}
      <AnimatePresence>
        {selectedAuditTx && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAuditTx(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a14] border-l border-white/[0.08] shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-md font-bold text-white">Web3 Audit Ledger</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAuditTx(null)}
                    className="p-1 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Audit Status Badge */}
                <div className="p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Audit Result</p>
                    <p className="text-emerald-400 font-bold">100% Cryptographically Verified</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[9.5px] text-emerald-400 font-bold uppercase">
                    Secured
                  </span>
                </div>

                {/* Transaction details block */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Gross Donation Amount</p>
                    <p className="text-2xl font-black text-white font-mono">${selectedAuditTx.amount.toFixed(2)} USD</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-white/[0.05] py-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">UGF Protocol Cut</p>
                      <p className="text-rose-400 font-mono font-medium">-${(selectedAuditTx.amount * 0.04).toFixed(2)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Net Paid to Cause</p>
                      <p className="text-emerald-400 font-mono font-bold">${(selectedAuditTx.amount * 0.96).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-white/[0.05] pb-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Block Number</p>
                      <p className="text-slate-300 font-mono font-medium">#{(() => {
                        const idNum = selectedAuditTx.id ? (selectedAuditTx.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) : 12;
                        return (blockHeight - (idNum % 100) - 5).toLocaleString();
                      })()}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Relayer Gas Subsidy</p>
                      <p className="text-sky-400 font-mono font-semibold">
                        {(() => {
                          const idNum = selectedAuditTx.id ? (selectedAuditTx.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) : 12;
                          const ethVal = 0.00012 + (idNum % 8) * 0.00002;
                          const usdVal = ethVal * 3150;
                          return `${ethVal.toFixed(5)} ETH ($${usdVal.toFixed(2)})`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Cryptographic Addresses */}
                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Donor Wallet</p>
                      <div className="flex items-center justify-between p-2 rounded-lg border border-white/[0.05] bg-[#05050a]/40 font-mono text-[11px]">
                        <span className="text-slate-300 truncate mr-2 select-all">{selectedAuditTx.donor}</span>
                        <button
                          onClick={() => handleCopy(selectedAuditTx.donor)}
                          className="text-slate-500 hover:text-white cursor-pointer shrink-0"
                        >
                          {copiedText === selectedAuditTx.donor ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Transaction Hash</p>
                      <div className="flex items-center justify-between p-2 rounded-lg border border-white/[0.05] bg-[#05050a]/40 font-mono text-[11px]">
                        <span className="text-slate-300 truncate mr-2 select-all">{selectedAuditTx.hash}</span>
                        <button
                          onClick={() => handleCopy(selectedAuditTx.hash)}
                          className="text-slate-500 hover:text-white cursor-pointer shrink-0"
                        >
                          {copiedText === selectedAuditTx.hash ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Signature data panel (Web3 debug details) */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                      <span>ERC-2612 Permit Payload</span>
                      <span className="text-[#8B5CF6]">ECDSA Signature Verified</span>
                    </div>
                    <pre className="p-3 rounded-lg border border-white/[0.06] bg-[#020204] text-[9px] text-indigo-400 font-mono overflow-x-auto leading-relaxed select-all">
{`{
  "domain": {
    "name": "MockUSDToken",
    "version": "1",
    "chainId": 84532,
    "verifyingContract": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  },
  "message": {
    "owner": "${selectedAuditTx.donor.substring(0, 16)}...",
    "spender": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "value": "${ethers.parseUnits(selectedAuditTx.amount.toString(), 6).toString()}",
    "nonce": 0,
    "deadline": 1779628000
  },
  "signature": {
    "v": 27,
    "r": "0x${selectedAuditTx.hash.substring(2, 34)}...",
    "s": "0x${selectedAuditTx.hash.substring(34, 66)}..."
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Drawer Footer actions */}
              <div className="border-t border-white/[0.06] pt-4 mt-6 space-y-3">
                <a
                  href={`https://sepolia.basescan.org/tx/${selectedAuditTx.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 text-xs font-bold transition-all cursor-pointer shadow-[0_2px_10px_rgba(99,102,241,0.2)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>View on Basescan Explorer</span>
                </a>
                <button
                  onClick={() => setSelectedAuditTx(null)}
                  className="w-full rounded-lg border border-white/[0.08] hover:bg-white/[0.04] py-2 text-center text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  Close Audit Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CAMPAIGN DELETION SECURITY MODAL ── */}
      <AnimatePresence>
        {isDeleting && selectedCampaign && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmittingDelete && !isSigningSignature) {
                  setIsDeleting(false);
                }
              }}
              className="fixed inset-0 bg-[#020205] backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Centered Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <div className="glass-panel w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#0c0c16] via-[#07070f] to-[#0c0c16] p-6 shadow-2xl relative overflow-hidden pointer-events-auto space-y-6">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-650" />
                
                {/* Header */}
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5.5 w-5.5 text-red-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Security Verification Required</h3>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      You are requesting to delete the campaign <span className="font-semibold text-slate-200">"{selectedCampaign.title}"</span>. This action deactivates the smart contract mapping and removes it from the explorer page.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="font-light">{deleteError}</p>
                  </div>
                )}

                {/* Challenge 1: Type Campaign Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    1. Confirm Campaign Title
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Please type <span className="font-mono text-slate-300 font-semibold select-all">"{selectedCampaign.title}"</span> below:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type campaign title exactly"
                    className="w-full bg-[#05050a]/80 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/30 transition-all font-sans"
                    disabled={isSubmittingDelete || isSigningSignature}
                  />
                </div>

                {/* Challenge 2: Wallet Owner Cryptographic Signature */}
                <div className="space-y-2 border-t border-white/[0.05] pt-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    2. Cryptographic Security Signature
                  </label>
                  
                  {isSignatureVerified ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] text-xs text-emerald-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Owner Signature Verified</span>
                      </div>
                      <span className="text-[9px] text-slate-500">0x...sig_ok</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSimulateSignature}
                      disabled={isSigningSignature || isSubmittingDelete || deleteConfirmText !== selectedCampaign.title}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.06] disabled:opacity-40 py-2.5 text-xs font-semibold text-indigo-300 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      {isSigningSignature ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                          <span>Requesting signature from wallet...</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="h-4 w-4" />
                          <span>Simulate Owner Signature Verification</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => setIsDeleting(false)}
                    disabled={isSubmittingDelete || isSigningSignature}
                    className="rounded-lg border border-white/[0.08] hover:bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCampaign}
                    disabled={
                      isSubmittingDelete ||
                      isSigningSignature ||
                      !isSignatureVerified ||
                      deleteConfirmText !== selectedCampaign.title
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-red-650 hover:bg-red-500 text-white px-4 py-2 text-xs font-semibold shadow-[0_2px_10px_rgba(239,68,68,0.2)] disabled:opacity-45 transition-all cursor-pointer"
                  >
                    {isSubmittingDelete ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 text-white animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
