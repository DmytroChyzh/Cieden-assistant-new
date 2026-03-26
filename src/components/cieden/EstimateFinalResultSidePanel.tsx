"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Sparkles,
  Clock3,
  Layers3,
  Search,
  LayoutTemplate,
  Palette,
  Component,
  Wand2,
  FlaskConical,
  PackageCheck,
  MessagesSquare,
  ArrowLeft,
} from "lucide-react";
import type { ElementType } from "react";
import type { EstimateFinalResult } from "./EstimateWizardPanel";
import { CiedenContactExternalBody } from "./CiedenContactInPanel";

const PHASE_ORDER: Array<{
  label: string;
  Icon: ElementType;
}> = [
  { label: "Discovery", Icon: Search },
  { label: "UX / IA", Icon: LayoutTemplate },
  { label: "UI design", Icon: Palette },
  { label: "Design system", Icon: Component },
  { label: "Prototyping", Icon: Wand2 },
  { label: "Testing & iteration", Icon: FlaskConical },
  { label: "Handoff & support", Icon: PackageCheck },
  { label: "PM / communication", Icon: MessagesSquare },
];

interface EstimateFinalResultSidePanelProps {
  result: EstimateFinalResult;
  onClose: () => void;
}

export function EstimateFinalResultSidePanel({ result, onClose }: EstimateFinalResultSidePanelProps) {
  const [showContactFull, setShowContactFull] = useState(false);
  const hasPhaseHours = !!result.phaseHours && Object.keys(result.phaseHours).length > 0;

  const hoursText = (() => {
    if (typeof result.minHours === "number" && typeof result.maxHours === "number") {
      return `${result.minHours}–${result.maxHours} hrs`;
    }
    if (typeof result.totalHours === "number") {
      return `${Math.round(result.totalHours)} hrs`;
    }
    return "— hrs";
  })();

  const weeksText = typeof result.weeks === "number" ? `${result.weeks} weeks` : "— weeks";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-full sm:w-1/2 z-50 flex flex-col bg-[#0a0a0c]/60 backdrop-blur-2xl border-l border-white/[0.12] shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
      style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), -8px 0 32px rgba(0,0,0,0.35)" }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0 bg-white/[0.03] backdrop-blur-sm border-b border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          {showContactFull ? (
            <button
              type="button"
              onClick={() => setShowContactFull(false)}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Back to estimate result"
              aria-disabled={false}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Back
            </button>
          ) : null}
          <Sparkles className="w-4 h-4 text-violet-300 shrink-0" aria-hidden />
          <h2 className="text-sm font-semibold text-white/90 truncate">
            {showContactFull ? "Contact our manager" : "Estimate result"}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer shrink-0"
          aria-label="Close estimate panel"
          aria-disabled={false}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showContactFull ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-2 scrollbar-chat">
          <CiedenContactExternalBody layout="panelFill" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 scrollbar-chat">
          <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] to-violet-600/[0.08] backdrop-blur-md p-5 shadow-[0_0_32px_rgba(99,102,241,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Final numbers</p>

            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-4xl font-bold text-white leading-none">
                ${result.minPrice.toLocaleString()} <span className="text-white/50">–</span> ${result.maxPrice.toLocaleString()}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1 text-[12px] font-medium text-white/75">
                <Clock3 className="w-3.5 h-3.5 text-sky-400" aria-hidden />
                {weeksText}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/[0.10] px-3 py-1 text-[12px] font-medium text-white/75">
                <Layers3 className="w-3.5 h-3.5 text-fuchsia-400" aria-hidden />
                {hoursText}
              </span>
            </div>

            {hasPhaseHours && (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">Phase breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  {PHASE_ORDER.map(({ label, Icon }) => {
                    const value = result.phaseHours?.[label] ?? 0;
                    const scaleMax = 1000;
                    const pct = Math.max(0, Math.min(100, Math.round((value / scaleMax) * 100)));
                    return (
                      <div key={label} className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-600/[0.06] p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
                            <Icon className="w-4 h-4" aria-hidden />
                          </span>
                          <span className="text-[15px] font-bold text-white/90 tabular-nums">{value}h</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[12px] font-semibold text-white/90">{label}</p>
                          <p className="text-[10px] text-white/40 tabular-nums">0–{scaleMax}h</p>
                        </div>

                        <div className="h-2 rounded-full bg-white/[0.10] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white/80"
                            style={{ width: `${pct}%` }}
                            aria-label={`${label} hours bar`}
                            aria-disabled={false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-white/40 leading-relaxed">
              For an accurate quote, our manager will review your project and get back within 1 business day.
            </p>

            <button
              type="button"
              onClick={() => setShowContactFull(true)}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600/30 hover:bg-violet-600/45 backdrop-blur-md border border-violet-400/30 py-3 px-4 text-sm font-medium text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] mt-4"
              aria-label="Contact our manager — full page in panel"
              aria-disabled={false}
            >
              Contact our manager
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

