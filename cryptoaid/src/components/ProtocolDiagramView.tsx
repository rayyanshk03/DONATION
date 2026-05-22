import React from "react";
import { ArrowLeft } from "lucide-react";
import TransactionSequenceDiagram from "./TransactionSequenceDiagram";

interface ProtocolDiagramViewProps {
  onBack: () => void;
}

export default function ProtocolDiagramView({ onBack }: ProtocolDiagramViewProps) {
  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050508]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 flex items-center h-[62px]">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] px-4 py-2 text-[13px] font-medium text-slate-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </button>
          <div className="ml-6 border-l border-white/[0.06] pl-6">
            <h1 className="text-[15px] font-semibold text-white">UGF Protocol Architecture</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">End-to-end gasless transaction lifecycle</p>
          </div>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="flex-1 w-full bg-[#08080c] p-6 md:p-12 overflow-y-auto">
        <div className="mx-auto max-w-[1440px]">
          <TransactionSequenceDiagram />
        </div>
      </div>
    </div>
  );
}

