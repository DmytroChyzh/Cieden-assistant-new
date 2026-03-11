"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { getEstimationRange, getGenericEstimationRange, type EstimationEntry } from "@/src/data/estimateRanges";

type ProjectKind = "from_scratch" | "redesign" | "other";
type ProjectType = "website" | "e-commerce" | "mobile-app" | "dashboard" | "landing" | "admin-panel" | "other";
type Complexity = "low" | "medium" | "high";
type Scope = "1-5" | "6-15" | "16-30" | "30+" | "not_sure";
type Timeline = "asap" | "1-3" | "3-6" | "flexible";
type Target = "b2b" | "b2c" | "internal" | "web_mobile" | "other";

const PROJECT_TYPES: { id: ProjectType; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "e-commerce", label: "E-commerce" },
  { id: "mobile-app", label: "Mobile app" },
  { id: "dashboard", label: "Dashboard" },
  { id: "landing", label: "Landing page" },
  { id: "admin-panel", label: "Admin panel" },
  { id: "other", label: "Other" },
];

const COMPLEXITY_OPTIONS: { id: Complexity; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: "1-5", label: "1–5 screens / pages" },
  { id: "6-15", label: "6–15 screens" },
  { id: "16-30", label: "16–30 screens" },
  { id: "30+", label: "30+ screens" },
  { id: "not_sure", label: "Not sure yet" },
];

const TIMELINE_OPTIONS: { id: Timeline; label: string }[] = [
  { id: "asap", label: "ASAP" },
  { id: "1-3", label: "1–3 months" },
  { id: "3-6", label: "3–6 months" },
  { id: "flexible", label: "Flexible" },
];

const TARGET_OPTIONS: { id: Target; label: string }[] = [
  { id: "b2b", label: "B2B" },
  { id: "b2c", label: "B2C" },
  { id: "internal", label: "Internal tool" },
  { id: "web_mobile", label: "Web + mobile" },
  { id: "other", label: "Other" },
];

const CUSTOM_PLACEHOLDER = "Or write your own (optional)";

interface EstimateWizardPanelProps {
  onClose: () => void;
}

export function EstimateWizardPanel({ onClose }: EstimateWizardPanelProps) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ProjectKind | null>(null);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [extraNotes, setExtraNotes] = useState("");
  const [customByStep, setCustomByStep] = useState<Record<string, string>>({});

  const stepIds = useMemo(() => {
    const base = ["kind"] as string[];
    if (kind === "from_scratch") base.push("projectType");
    if (kind) {
      base.push("scope", "complexity", "timeline", "target", "extra");
    }
    base.push("result");
    return base;
  }, [kind]);

  const currentStepId = stepIds[step];
  const totalSteps = stepIds.length - 1; // exclude result
  const isResultStep = currentStepId === "result";

  const result = useMemo((): EstimationEntry | null => {
    if (!complexity) return null;
    if (kind === "redesign") return getEstimationRange("redesign", complexity);
    if (kind === "other") return getGenericEstimationRange(complexity);
    if (kind === "from_scratch" && projectType) {
      if (projectType === "other") return getGenericEstimationRange(complexity);
      return getEstimationRange(projectType, complexity);
    }
    return null;
  }, [kind, projectType, complexity]);

  const progressPercent = isResultStep
    ? 100
    : totalSteps > 0
      ? Math.round(((step + 1) / totalSteps) * 100)
      : 0;

  const setCustom = (stepId: string, value: string) => {
    setCustomByStep((prev) => ({ ...prev, [stepId]: value }));
  };

  const goNext = () => setStep((s) => Math.min(s + 1, stepIds.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const renderCustomInput = (stepId: string, placeholder?: string) => (
    <div className="mt-3">
      <label className="block text-xs text-white/50 mb-1">{CUSTOM_PLACEHOLDER}</label>
      <input
        type="text"
        value={customByStep[stepId] ?? ""}
        onChange={(e) => setCustom(stepId, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      />
    </div>
  );

  const renderOptionButtons = <T extends string>(
    options: { id: T; label: string }[],
    value: T | null,
    onChange: (v: T) => void,
    stepId: string,
    showContinue?: boolean
  ) => (
    <>
      <div className="grid gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="flex items-center justify-between w-full rounded-xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-4 py-3.5 text-left hover:bg-white/[0.1] hover:border-white/[0.2] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <span className="text-sm font-medium text-white/90">{opt.label}</span>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        ))}
      </div>
      {renderCustomInput(stepId)}
      {showContinue && (
        <button
          type="button"
          onClick={goNext}
          disabled={!canContinue()}
          className="w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer mt-2 shadow-[0_0_20px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          Continue →
        </button>
      )}
    </>
  );

  const handleKind = (v: ProjectKind) => {
    setKind(v);
    setStep(1);
  };

  const handleProjectType = (v: ProjectType) => {
    setProjectType(v);
    setStep(stepIds.indexOf("projectType") + 1);
  };

  const handleScope = (v: Scope) => {
    setScope(v);
    goNext();
  };

  const handleComplexity = (v: Complexity) => {
    setComplexity(v);
    goNext();
  };

  const handleTimeline = (v: Timeline) => {
    setTimeline(v);
    goNext();
  };

  const handleTarget = (v: Target) => {
    setTarget(v);
    goNext();
  };

  const canContinue = (): boolean => {
    if (currentStepId === "scope") return scope !== null || !!customByStep["scope"]?.trim();
    if (currentStepId === "complexity") return complexity !== null || !!customByStep["complexity"]?.trim();
    if (currentStepId === "timeline") return timeline !== null || !!customByStep["timeline"]?.trim();
    if (currentStepId === "target") return target !== null || !!customByStep["target"]?.trim();
    return false;
  };

  const handleExtraNext = () => goNext();

  const allCustomNotes = useMemo(() => {
    const parts: string[] = [];
    if (kind) parts.push(`What you need: ${kind === "from_scratch" ? "Design from scratch" : kind === "redesign" ? "Redesign" : "Other"}`);
    if (customByStep["kind"]) parts.push(`  → ${customByStep["kind"]}`);
    if (projectType) parts.push(`Project type: ${PROJECT_TYPES.find((p) => p.id === projectType)?.label ?? projectType}`);
    if (customByStep["projectType"]) parts.push(`  → ${customByStep["projectType"]}`);
    if (scope) parts.push(`Scope: ${SCOPE_OPTIONS.find((s) => s.id === scope)?.label ?? scope}`);
    if (customByStep["scope"]) parts.push(`  → ${customByStep["scope"]}`);
    if (complexity) parts.push(`Complexity: ${complexity}`);
    if (customByStep["complexity"]) parts.push(`  → ${customByStep["complexity"]}`);
    if (timeline) parts.push(`Timeline: ${TIMELINE_OPTIONS.find((t) => t.id === timeline)?.label ?? timeline}`);
    if (customByStep["timeline"]) parts.push(`  → ${customByStep["timeline"]}`);
    if (target) parts.push(`Target: ${TARGET_OPTIONS.find((t) => t.id === target)?.label ?? target}`);
    if (customByStep["target"]) parts.push(`  → ${customByStep["target"]}`);
    if (extraNotes) parts.push(`Extra: ${extraNotes}`);
    return parts;
  }, [kind, projectType, scope, complexity, timeline, target, customByStep, extraNotes]);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-full sm:w-1/2 z-50 flex flex-col bg-[#0a0a0c]/60 backdrop-blur-2xl border-l border-white/[0.12] shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
      style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), -8px 0 32px rgba(0,0,0,0.35)" }}
    >
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-white/[0.03] backdrop-blur-sm border-b border-white/[0.08]">
        <h2 className="text-sm font-semibold text-white/90">Preliminary estimate</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isResultStep && (
        <div className="px-5 pt-4 pb-2 shrink-0">
          <p className="text-xs font-medium text-white/70">
            Question {step + 1}/{totalSteps}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/40">{progressPercent}% complete</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 scrollbar-chat">
        <AnimatePresence mode="wait">
          {currentStepId === "kind" && (
            <motion.div key="kind" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">What do you need?</p>
              {[
                { id: "from_scratch" as const, label: "Design from scratch" },
                { id: "redesign" as const, label: "Redesign" },
                { id: "other" as const, label: "Other" },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => handleKind(opt.id)} className="flex items-center justify-between w-full rounded-xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-4 py-3.5 text-left hover:bg-white/[0.1] hover:border-white/[0.2] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <span className="text-sm font-medium text-white/90">{opt.label}</span>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              ))}
              {renderCustomInput("kind", "e.g. design system, audit...")}
            </motion.div>
          )}

          {currentStepId === "projectType" && (
            <motion.div key="projectType" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Project type?</p>
              {renderOptionButtons(PROJECT_TYPES, projectType, (v) => handleProjectType(v), "projectType", false)}
            </motion.div>
          )}

          {currentStepId === "scope" && (
            <motion.div key="scope" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Rough scope (screens / pages)?</p>
              {renderOptionButtons(SCOPE_OPTIONS, scope, handleScope, "scope", true)}
            </motion.div>
          )}

          {currentStepId === "complexity" && (
            <motion.div key="complexity" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Complexity?</p>
              {renderOptionButtons(COMPLEXITY_OPTIONS, complexity, handleComplexity, "complexity", true)}
            </motion.div>
          )}

          {currentStepId === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Desired timeline?</p>
              {renderOptionButtons(TIMELINE_OPTIONS, timeline, handleTimeline, "timeline", true)}
            </motion.div>
          )}

          {currentStepId === "target" && (
            <motion.div key="target" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Target users / platform?</p>
              {renderOptionButtons(TARGET_OPTIONS, target, handleTarget, "target", true)}
            </motion.div>
          )}

          {currentStepId === "extra" && (
            <motion.div key="extra" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <p className="text-base font-semibold text-white/95">Anything else we should know?</p>
              <textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Optional: constraints, must-haves, references..."
                rows={3}
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              />
              <button type="button" onClick={handleExtraNext} className="w-full rounded-xl border border-violet-400/30 bg-violet-500/20 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/90 hover:bg-violet-500/30 transition-colors cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
                See preliminary range →
              </button>
            </motion.div>
          )}

          {isResultStep && (
            <motion.div key="result" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <p className="text-base font-semibold text-white/95">Preliminary range</p>
              {result ? (
                <>
                  <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 backdrop-blur-md p-5 text-center shadow-[0_0_24px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300/90">Estimated range</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-100 drop-shadow-sm">
                      ${result.minPrice.toLocaleString()} – ${result.maxPrice.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-white/50">{result.timeline}</p>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Based on your answers. For an accurate quote, please contact our manager.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/70">
                  We'll prepare a tailored estimate based on your notes. Please contact our manager for the exact range.
                </p>
              )}
              {allCustomNotes.length > 0 && (
                <div className="rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-md px-4 py-3 space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Your answers & notes</p>
                  {allCustomNotes.map((line, i) => (
                    <p key={i} className="text-xs text-white/75">{line}</p>
                  ))}
                  <p className="text-[10px] text-white/45 pt-1">We'll use this in the follow-up.</p>
                </div>
              )}
              <a href="https://cieden.com/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 py-3 px-4 text-sm font-medium text-white/90 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                See pricing on cieden.com <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step > 0 && !isResultStep && (
        <div className="shrink-0 px-5 py-3 bg-white/[0.02] backdrop-blur-sm border-t border-white/[0.08]">
          <button type="button" onClick={goBack} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1 cursor-pointer">
            ← Previous
          </button>
        </div>
      )}
    </motion.div>
  );
}
