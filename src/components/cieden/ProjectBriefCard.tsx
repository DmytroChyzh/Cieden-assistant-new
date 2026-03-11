"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ClipboardList, Calendar, DollarSign, Target } from "lucide-react";

interface ProjectBriefData {
  productType?: string;
  platforms?: string[];
  budgetRange?: string;
  timeline?: string;
  primaryGoal?: string;
  secondaryGoals?: string[];
  notes?: string;
}

interface ProjectBriefCardProps {
  data?: ProjectBriefData;
  className?: string;
  compact?: boolean;
  onUserAction?: ((text: string) => void) | null;
}

export function ProjectBriefCard({
  data,
  className,
  compact = false,
  onUserAction,
}: ProjectBriefCardProps) {
  const brief = data || {};

  const handleQuickFill = (preset: Partial<ProjectBriefData>) => {
    const merged = { ...brief, ...preset };
    const message = `Project brief updated: ${JSON.stringify(merged)}`;
    onUserAction?.(message);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 22 }}
      className={cn("max-w-5xl w-full mx-auto", className)}
    >
      <Card className="relative overflow-hidden bg-black/85 border border-white/10 rounded-[36px] backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/18 via-transparent to-sky-400/14 pointer-events-none" />

        <CardHeader className="relative flex flex-row items-start gap-4 pb-4 pt-7 px-7">
          <div className="p-3 rounded-2xl bg-violet-500/25 border border-violet-300/40 text-violet-50 shadow-lg">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-white text-2xl sm:text-[26px] font-semibold">
              Project brief
            </CardTitle>
            <CardDescription className="text-white/70 text-sm sm:text-base">
              Snapshot of what you want us to design and build.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative grid gap-6 sm:grid-cols-2 p-6 sm:p-7 pt-3">
          {/* Left column – core attributes */}
          <div className="space-y-4">
            <SectionLabel icon={<Target className="h-4 w-4" />} title="Product" />
            <InfoRow
              label="Product type"
              value={brief.productType || "Not specified yet"}
            />
            <InfoRow
              label="Platforms"
              value={
                brief.platforms && brief.platforms.length
                  ? brief.platforms.join(", ")
                  : "Web, mobile or both"
              }
            />

            <SectionLabel icon={<DollarSign className="h-4 w-4" />} title="Budget & scope" />
            <InfoRow
              label="Budget range"
              value={brief.budgetRange || "To be discussed"}
            />
            <InfoRow
              label="Primary goal"
              value={brief.primaryGoal || "Not captured yet"}
            />
          </div>

          {/* Right column – timing & notes */}
          <div className="space-y-4">
            <SectionLabel icon={<Calendar className="h-4 w-4" />} title="Timeline" />
            <InfoRow
              label="Target timeline"
              value={brief.timeline || "Flexible / not specified"}
            />

            <SectionLabel title="Nice‑to‑haves" />
            <InfoRow
              label="Secondary goals"
              value={
                brief.secondaryGoals && brief.secondaryGoals.length
                  ? brief.secondaryGoals.join(" • ")
                  : "We can help you capture this together."
              }
              onClick={
                onUserAction
                  ? () =>
                      onUserAction(
                        "User wants to refine secondary goals. Ask for 2–3 specific outcomes they care about.",
                      )
                  : undefined
              }
            />
            <InfoRow
              label="Notes"
              multiline
              value={
                brief.notes ||
                "Use this space for any constraints, stakeholders, or technical preferences."
              }
              onClick={
                onUserAction
                  ? () =>
                      onUserAction(
                        "User wants to refine project notes. Ask clarifying questions about constraints, stakeholders, and technical stack.",
                      )
                  : undefined
              }
            />

            {!compact && (
              <div className="mt-4 flex flex-wrap gap-2">
                <QuickPresetButton
                  label="Early‑stage MVP"
                  onClick={() =>
                    handleQuickFill({
                      productType: "MVP for B2B SaaS",
                      budgetRange: brief.budgetRange || "$30k–$70k",
                      timeline: brief.timeline || "2–3 months",
                    })
                  }
                />
                <QuickPresetButton
                  label="Redesign existing app"
                  onClick={() =>
                    handleQuickFill({
                      productType: "Redesign of existing product",
                      primaryGoal:
                        brief.primaryGoal || "Improve UX and visual consistency without breaking flows",
                    })
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SectionLabelProps {
  title: string;
  icon?: React.ReactNode;
}

function SectionLabel({ title, icon }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
      {icon && <span className="text-violet-300">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  multiline?: boolean;
  onClick?: () => void;
}

function InfoRow({ label, value, multiline, onClick }: InfoRowProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wide text-white/50 mb-1">
        {label}
      </div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left rounded-lg px-0.5 py-0.5 transition-colors hover:bg-white/5 active:bg-white/10"
        >
          <div
            className={cn(
              "text-[13px] sm:text-sm text-white/90",
              multiline ? "whitespace-pre-wrap break-words" : "truncate",
            )}
            title={value}
          >
            {value}
          </div>
        </button>
      ) : (
        <div
          className={cn(
            "text-[13px] sm:text-sm text-white/90",
            multiline ? "whitespace-pre-wrap break-words" : "truncate",
          )}
          title={value}
        >
          {value}
        </div>
      )}
    </div>
  );
}

interface QuickPresetButtonProps {
  label: string;
  onClick: () => void;
}

function QuickPresetButton({ label, onClick }: QuickPresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-100 hover:bg-violet-500/20 hover:border-violet-300 transition-colors"
    >
      {label}
    </button>
  );
}

